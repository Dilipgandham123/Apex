import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { NotificationEvent, Prisma } from "@hyd/database";
import { DatabaseService } from "../database.service";
import { decryptPayload, queueNotifications, type NotificationPayload } from "./notification-outbox";

const retryMinutes = [1, 5, 30, 120];
const templateEnv: Record<NotificationEvent, string> = {
  OTP: "WHATSAPP_TEMPLATE_OTP", PAYMENT_CONFIRMED: "WHATSAPP_TEMPLATE_PAYMENT_CONFIRMED", PAYMENT_REMINDER: "WHATSAPP_TEMPLATE_PAYMENT_REMINDER",
  DEADLINE_WARNING: "WHATSAPP_TEMPLATE_DEADLINE_WARNING", COURSE_COMPLETED: "WHATSAPP_TEMPLATE_COURSE_COMPLETED", COMPLAINT_REPLY: "WHATSAPP_TEMPLATE_COMPLAINT_REPLY",
};

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private lastSweepDay = "";
  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 30_000);
    this.timer.unref();
    setImmediate(() => void this.recoverAndTick());
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  list(schoolId: string) { return this.db.notification.findMany({ where: { schoolId }, include: { attempts: { orderBy: { attemptNumber: "desc" }, take: 5 } }, orderBy: { createdAt: "desc" }, take: 200 }); }

  async retry(schoolId: string, id: string) {
    const notification = await this.db.notification.findFirst({ where: { id, schoolId } });
    if (!notification) throw new NotFoundException("Notification was not found");
    return this.db.notification.update({ where: { id }, data: { status: "PENDING", nextAttemptAt: new Date(), lastError: null } });
  }

  async processDue(limit = 20) {
    const due = await this.db.notification.findMany({ where: { status: "PENDING", nextAttemptAt: { lte: new Date() } }, orderBy: { nextAttemptAt: "asc" }, take: limit });
    let processed = 0;
    for (const notification of due) {
      const claimed = await this.db.notification.updateMany({ where: { id: notification.id, status: "PENDING", nextAttemptAt: { lte: new Date() } }, data: { status: "PROCESSING" } });
      if (!claimed.count) continue;
      processed++;
      await this.deliver(notification).catch(() => undefined);
    }
    return { processed };
  }

  async sweepScheduled(now = new Date()) {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 15 * 86400000);
    const rows = await this.db.courseEnrollment.findMany({ where: { status: { in: ["ACTIVE", "EXPIRED"] }, deadlineAt: { gte: start, lt: end } }, include: { customer: { include: { user: { select: { id: true, phone: true, email: true, displayName: true } } } }, payments: { select: { status: true, amount: true, refundedAmount: true } } } });
    let queued = 0;
    for (const row of rows) {
      const days = Math.max(0, Math.ceil((row.deadlineAt!.getTime() - start.getTime()) / 86400000));
      const dateKey = row.deadlineAt!.toISOString().slice(0, 10), user = row.customer.user;
      if ([7, 3, 1, 0].includes(days)) queued += (await queueNotifications(this.db, { schoolId: row.customer.schoolId, userId: user.id, eventType: "DEADLINE_WARNING", eventId: `${row.id}:${dateKey}:${days}`, phone: user.phone, email: user.email, payload: { subject: "Driving course deadline reminder", text: `${user.displayName}, your ${row.courseNameSnapshot} completion deadline is ${dateKey}. ${days ? `${days} day${days === 1 ? "" : "s"} remain.` : "The deadline is today."}`, values: [user.displayName, row.courseNameSnapshot, dateKey, String(days)] } })).count;
      const paid = row.payments.filter(item => ["VERIFIED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(item.status)).reduce((sum, item) => sum.plus(item.amount).minus(item.refundedAmount), new Prisma.Decimal(0)), pending = Prisma.Decimal.max(0, row.totalPayable.minus(paid));
      if (pending.greaterThan(0) && [14, 7, 3, 1, 0].includes(days)) queued += (await queueNotifications(this.db, { schoolId: row.customer.schoolId, userId: user.id, eventType: "PAYMENT_REMINDER", eventId: `${row.id}:${dateKey}:${days}`, phone: user.phone, email: user.email, payload: { subject: "Driving course payment reminder", text: `${user.displayName}, ₹${pending.toString()} remains payable for ${row.courseNameSnapshot}.`, values: [user.displayName, pending.toString(), row.courseNameSnapshot, dateKey] } })).count;
    }
    return { queued };
  }

  private async tick() {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.lastSweepDay) { this.lastSweepDay = today; await this.sweepScheduled().catch(() => undefined); }
    await this.processDue().catch(() => undefined);
  }

  private async recoverAndTick() {
    await this.db.notification.updateMany({
      where: { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      data: { status: "PENDING", nextAttemptAt: new Date() },
    }).catch(() => undefined);
    await this.tick();
  }

  private async deliver(notification: { id: string; eventType: NotificationEvent; channel: "WHATSAPP" | "EMAIL"; recipient: string; payloadEncrypted: string; idempotencyKey: string; attemptCount: number }) {
    const attemptNumber = notification.attemptCount + 1;
    try {
      const result = await this.send(notification, decryptPayload(notification.payloadEncrypted));
      await this.db.$transaction([this.db.notificationAttempt.create({ data: { notificationId: notification.id, attemptNumber, success: true, providerResult: result as Prisma.InputJsonObject } }), this.db.notification.update({ where: { id: notification.id }, data: { status: "SENT", attemptCount: attemptNumber, sentAt: new Date(), providerMessageId: result.id, lastError: null } })]);
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : "Notification delivery failed", terminal = attemptNumber >= 5;
      await this.db.$transaction([this.db.notificationAttempt.create({ data: { notificationId: notification.id, attemptNumber, success: false, error: message } }), this.db.notification.update({ where: { id: notification.id }, data: { status: terminal ? "FAILED" : "PENDING", attemptCount: attemptNumber, lastError: message, nextAttemptAt: new Date(Date.now() + (retryMinutes[attemptNumber - 1] ?? 120) * 60000) } })]);
    }
  }

  private async send(notification: { id: string; eventType: NotificationEvent; channel: "WHATSAPP" | "EMAIL"; recipient: string; idempotencyKey: string }, payload: NotificationPayload) {
    if (process.env.NOTIFICATION_DELIVERY_MODE === "log" && process.env.NODE_ENV !== "production") return { id: `local-${notification.id}`, mode: "log" };
    return notification.channel === "WHATSAPP" ? this.whatsapp(notification, payload) : this.email(notification, payload);
  }

  private async whatsapp(notification: { eventType: NotificationEvent; recipient: string }, payload: NotificationPayload) {
    const token = process.env.META_WHATSAPP_ACCESS_TOKEN, phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID, version = process.env.META_GRAPH_API_VERSION, template = process.env[templateEnv[notification.eventType]];
    if (!token || !phoneId || !version || !template) throw new Error(`WhatsApp provider is not configured for ${notification.eventType}`);
    const components: Array<Record<string, unknown>> = [{ type: "body", parameters: payload.values.map(text => ({ type: "text", text })) }];
    if (payload.otp) components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: payload.values[0] }] });
    const response = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, { method: "POST", signal: AbortSignal.timeout(10_000), headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: notification.recipient, type: "template", template: { name: template, language: { code: process.env.META_WHATSAPP_LANGUAGE ?? "en" }, components } }) });
    const result = await response.json() as { messages?: Array<{ id: string }>; error?: { message?: string } };
    if (!response.ok || !result.messages?.[0]?.id) throw new Error(result.error?.message ?? `WhatsApp returned ${response.status}`);
    return { id: result.messages[0].id, status: response.status };
  }

  private async email(notification: { recipient: string; idempotencyKey: string }, payload: NotificationPayload) {
    const key = process.env.RESEND_API_KEY, from = process.env.RESEND_FROM_EMAIL;
    if (!key || !from) throw new Error("Email provider is not configured");
    const response = await fetch("https://api.resend.com/emails", { method: "POST", signal: AbortSignal.timeout(10_000), headers: { authorization: `Bearer ${key}`, "content-type": "application/json", "idempotency-key": notification.idempotencyKey, "user-agent": "hyd-driving-academy/1.0" }, body: JSON.stringify({ from, to: [notification.recipient], subject: payload.subject, text: payload.text }) });
    const result = await response.json() as { id?: string; message?: string };
    if (!response.ok || !result.id) throw new Error(result.message ?? `Email provider returned ${response.status}`);
    return { id: result.id, status: response.status };
  }
}
