import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma } from "@hyd/database";
import { DatabaseService } from "../database.service";
import type { CreateOrderDto, ManualPaymentDto, RefundPaymentDto, VerifyPaymentDto } from "./payments.dto";
import { queueNotifications } from "../notifications/notification-outbox";

const settled = ["VERIFIED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;
@Injectable()
export class PaymentsService {
  constructor(private readonly db: DatabaseService) {}

  async adminList(schoolId: string) {
    const enrollments = await this.db.courseEnrollment.findMany({ where: { customer: { schoolId } }, include: { customer: { include: { user: { select: { displayName: true, phone: true } } } }, payments: { include: { refunds: true }, orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" } });
    return enrollments.map(enrollment => ({ ...enrollment, ...this.balance(enrollment.totalPayable, enrollment.payments) }));
  }

  customerPayments(userId: string, schoolId: string) {
    return this.db.courseEnrollment.findFirst({ where: { customer: { userId, schoolId } }, orderBy: { createdAt: "desc" }, include: { payments: { where: { status: { in: [...settled] } }, include: { refunds: { where: { status: "PROCESSED" } } }, orderBy: { createdAt: "desc" } } } }).then(enrollment => {
      if (!enrollment) throw new NotFoundException("Customer enrollment was not found");
      return { payments: enrollment.payments, ...this.balance(enrollment.totalPayable, enrollment.payments) };
    });
  }

  async manual(schoolId: string, userId: string, input: ManualPaymentDto) {
    try { return await this.db.$transaction(async transaction => {
      const enrollment = await transaction.courseEnrollment.findFirst({ where: { id: input.enrollmentId, customer: { schoolId } }, include: { payments: true, customer: { include: { user: { select: { id: true, displayName: true, phone: true, email: true } } } } } });
      if (!enrollment) throw new NotFoundException("Enrollment was not found");
      if (new Prisma.Decimal(input.amount).greaterThan(this.balance(enrollment.totalPayable, enrollment.payments).pendingAmount)) throw new BadRequestException("Payment exceeds the pending balance");
      const payment = await transaction.payment.create({ data: { schoolId, enrollmentId: enrollment.id, amount: input.amount, method: input.method, status: "VERIFIED", receiptNumber: this.receipt(), reference: input.reference?.trim() || null, note: input.note?.trim() || null, recordedByUserId: userId, verifiedAt: new Date() }, include: { refunds: true } });
      await transaction.auditLog.create({ data: { schoolId, actorUserId: userId, action: "payment.manual_recorded", entityType: "Payment", entityId: payment.id, metadata: { amount: input.amount, method: input.method, receiptNumber: payment.receiptNumber } } });
      const customer = enrollment.customer.user;
      await queueNotifications(transaction, { schoolId, userId: customer.id, eventType: "PAYMENT_CONFIRMED", eventId: payment.id, phone: customer.phone, email: customer.email, payload: { subject: "Driving course payment received", text: `${customer.displayName}, we received ₹${payment.amount.toString()}. Receipt: ${payment.receiptNumber}.`, values: [customer.displayName, payment.amount.toString(), payment.receiptNumber] } });
      return payment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw new ConflictException("Balance changed; review and try again"); throw error; }
  }

  async createOrder(userId: string, schoolId: string, input: CreateOrderDto) {
    const enrollment = await this.db.courseEnrollment.findFirst({ where: { customer: { userId, schoolId } }, orderBy: { createdAt: "desc" }, include: { payments: true } });
    if (!enrollment) throw new NotFoundException("Customer enrollment was not found");
    const amount = new Prisma.Decimal(input.amount);
    if (amount.greaterThan(this.balance(enrollment.totalPayable, enrollment.payments).pendingAmount)) throw new BadRequestException("Payment exceeds the pending balance");
    const receiptNumber = this.receipt();
    const order = await this.razorpay<{ id: string; amount: number; currency: string }>("/orders", { amount: amount.mul(100).toNumber(), currency: "INR", receipt: receiptNumber });
    await this.db.payment.create({ data: { schoolId, enrollmentId: enrollment.id, amount, method: "RAZORPAY", status: "PENDING", receiptNumber, providerOrderId: order.id } });
    return { keyId: this.keyId(), orderId: order.id, amount: order.amount, currency: order.currency, receiptNumber, customer: { name: "", phone: "" } };
  }

  async verify(userId: string, schoolId: string, input: VerifyPaymentDto) {
    const payment = await this.db.payment.findFirst({ where: { providerOrderId: input.razorpayOrderId, enrollment: { customer: { userId, schoolId } } } });
    if (!payment) throw new NotFoundException("Razorpay order was not found");
    if (payment.status !== "PENDING") return payment;
    if (!this.validHmac(`${payment.providerOrderId}|${input.razorpayPaymentId}`, input.razorpaySignature, this.keySecret())) throw new UnauthorizedException("Payment signature is invalid");
    if (!(process.env.NODE_ENV !== "production" && process.env.RAZORPAY_SKIP_PAYMENT_FETCH === "true")) {
      const remote = await this.razorpayGet<{ status: string; amount: number; order_id: string }>(`/payments/${encodeURIComponent(input.razorpayPaymentId)}`);
      if (remote.status !== "captured" || remote.order_id !== payment.providerOrderId || remote.amount !== payment.amount.mul(100).toNumber()) throw new BadRequestException("Razorpay payment is not captured or does not match this order");
    }
    return this.settle(payment.id, input.razorpayPaymentId, "payment.checkout_verified");
  }

  async refund(schoolId: string, userId: string, paymentId: string, input: RefundPaymentDto) {
    const payment = await this.db.payment.findFirst({ where: { id: paymentId, schoolId, status: { in: [...settled] } } });
    if (!payment) throw new NotFoundException("Verified payment was not found");
    const amount = new Prisma.Decimal(input.amount), remaining = payment.amount.minus(payment.refundedAmount);
    if (amount.greaterThan(remaining)) throw new BadRequestException("Refund exceeds the unrefunded payment amount");
    let providerRefundId: string | undefined, processed = true;
    if (payment.method === "RAZORPAY") {
      if (!payment.providerPaymentId) throw new BadRequestException("Razorpay payment reference is missing");
      const remote = await this.razorpay<{ id: string; status?: string }>(`/payments/${encodeURIComponent(payment.providerPaymentId)}/refund`, { amount: amount.mul(100).toNumber(), notes: { reason: input.reason.trim() } });
      providerRefundId = remote.id; processed = remote.status === "processed";
    }
    return this.db.$transaction(async transaction => {
      const refund = await transaction.paymentRefund.create({ data: { paymentId, amount, status: processed ? "PROCESSED" : "PENDING", reason: input.reason.trim(), providerRefundId, createdByUserId: userId, processedAt: processed ? new Date() : null } });
      if (processed) await this.applyRefund(transaction, payment, amount);
      await transaction.auditLog.create({ data: { schoolId, actorUserId: userId, action: "payment.refund_requested", entityType: "PaymentRefund", entityId: refund.id, metadata: { paymentId, amount: amount.toString(), reason: input.reason.trim(), processed } } });
      return refund;
    });
  }

  async webhook(rawBody: Buffer, signature: string | undefined, eventId: string | undefined) {
    if (!signature || !eventId || !this.validHmac(rawBody, signature, this.webhookSecret())) throw new UnauthorizedException("Webhook signature is invalid");
    const payload = JSON.parse(rawBody.toString("utf8")) as { event: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } }; refund?: { entity?: { id?: string; payment_id?: string; amount?: number; status?: string } } } };
    try { return await this.db.$transaction(async transaction => {
      const paymentEntity = payload.payload?.payment?.entity, refundEntity = payload.payload?.refund?.entity;
      const payment = paymentEntity?.order_id ? await transaction.payment.findUnique({ where: { providerOrderId: paymentEntity.order_id } }) : refundEntity?.payment_id ? await transaction.payment.findUnique({ where: { providerPaymentId: refundEntity.payment_id } }) : null;
      await transaction.paymentWebhookEvent.create({ data: { providerEventId: eventId, eventType: payload.event, payload: payload as Prisma.InputJsonValue, schoolId: payment?.schoolId } });
      if (payload.event === "payment.captured" && payment && paymentEntity?.id) await this.settle(payment.id, paymentEntity.id, "payment.webhook_captured", transaction);
      if (payload.event === "refund.processed" && payment && refundEntity?.id && refundEntity.amount) {
        const refund = await transaction.paymentRefund.findUnique({ where: { providerRefundId: refundEntity.id } });
        if (refund && refund.status !== "PROCESSED") { await transaction.paymentRefund.update({ where: { id: refund.id }, data: { status: "PROCESSED", processedAt: new Date() } }); await this.applyRefund(transaction, payment, new Prisma.Decimal(refundEntity.amount).div(100)); }
      }
      return { received: true };
    }); } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { received: true, duplicate: true }; throw error; }
  }

  private balance(total: Prisma.Decimal, payments: Array<{ amount: Prisma.Decimal; refundedAmount: Prisma.Decimal; status: string }>) { const paid = payments.filter(payment => settled.includes(payment.status as typeof settled[number])).reduce((sum, payment) => sum.plus(payment.amount).minus(payment.refundedAmount), new Prisma.Decimal(0)); return { paidAmount: paid.toString(), pendingAmount: Prisma.Decimal.max(0, total.minus(paid)).toString() }; }
  private async settle(id: string, providerPaymentId: string, action: string, transaction: Prisma.TransactionClient | DatabaseService = this.db) { const payment = await transaction.payment.update({ where: { id }, data: { status: "VERIFIED", providerPaymentId, verifiedAt: new Date() }, include: { enrollment: { include: { customer: { include: { user: { select: { id: true, displayName: true, phone: true, email: true } } } } } } } }); await transaction.auditLog.create({ data: { schoolId: payment.schoolId, action, entityType: "Payment", entityId: payment.id, metadata: { providerOrderId: payment.providerOrderId, providerPaymentId } } }); const customer=payment.enrollment.customer.user; await queueNotifications(transaction,{schoolId:payment.schoolId,userId:customer.id,eventType:"PAYMENT_CONFIRMED",eventId:payment.id,phone:customer.phone,email:customer.email,payload:{subject:"Driving course payment received",text:`${customer.displayName}, we received ₹${payment.amount.toString()}. Receipt: ${payment.receiptNumber}.`,values:[customer.displayName,payment.amount.toString(),payment.receiptNumber]}}); return payment; }
  private async applyRefund(transaction: Prisma.TransactionClient, payment: { id: string; amount: Prisma.Decimal; refundedAmount: Prisma.Decimal }, amount: Prisma.Decimal) { const refundedAmount = payment.refundedAmount.plus(amount); await transaction.payment.update({ where: { id: payment.id }, data: { refundedAmount, status: refundedAmount.equals(payment.amount) ? "REFUNDED" : "PARTIALLY_REFUNDED" } }); }
  private receipt() { return `SSA-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`; }
  private keyId() { const value = process.env.RAZORPAY_KEY_ID; if (!value) throw new ServiceUnavailableException("Razorpay is not configured"); return value; }
  private keySecret() { const value = process.env.RAZORPAY_KEY_SECRET; if (!value) throw new ServiceUnavailableException("Razorpay is not configured"); return value; }
  private webhookSecret() { const value = process.env.RAZORPAY_WEBHOOK_SECRET; if (!value) throw new ServiceUnavailableException("Razorpay webhook is not configured"); return value; }
  private validHmac(value: string | Buffer, supplied: string, secret: string) { const expected = createHmac("sha256", secret).update(value).digest(); let actual: Buffer; try { actual = Buffer.from(supplied, "hex"); } catch { return false; } return actual.length === expected.length && timingSafeEqual(actual, expected); }
  private async razorpay<T>(path: string, body: object) { return this.provider<T>(path, { method: "POST", body: JSON.stringify(body) }); }
  private async razorpayGet<T>(path: string) { return this.provider<T>(path, { method: "GET" }); }
  private async provider<T>(path: string, init: RequestInit) { const response = await fetch(`${process.env.RAZORPAY_API_BASE ?? "https://api.razorpay.com/v1"}${path}`, { ...init, headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${this.keyId()}:${this.keySecret()}`).toString("base64")}` } }); if (!response.ok) throw new BadGatewayException("Razorpay request failed"); return response.json() as Promise<T>; }
}
