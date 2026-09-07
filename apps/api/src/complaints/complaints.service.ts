import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { DatabaseService } from "../database.service";
import type { ComplaintReplyDto, CreateComplaintDto, UpdateComplaintDto } from "./complaints.dto";
import { queueNotifications } from "../notifications/notification-outbox";

const customerInclude = { attachments: true, lesson: { select: { id: true, classNumber: true } }, staff: { select: { id: true, staffCode: true, user: { select: { displayName: true } } } }, vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } }, payment: { select: { id: true, receiptNumber: true, amount: true } }, messages: { where: { visibility: "PUBLIC" as const }, include: { author: { select: { id: true, displayName: true } } }, orderBy: { createdAt: "asc" as const } } };
const adminInclude = { ...customerInclude, customer: { select: { displayName: true, phone: true } }, enrollment: { select: { courseNameSnapshot: true, customer: { select: { customerCode: true } } } }, messages: { include: { author: { select: { id: true, displayName: true } } }, orderBy: { createdAt: "asc" as const } } };

@Injectable()
export class ComplaintsService {
  constructor(private readonly db: DatabaseService) {}

  customerList(userId: string, schoolId: string) { return this.db.complaint.findMany({ where: { customerUserId: userId, schoolId }, include: customerInclude, orderBy: { createdAt: "desc" } }); }
  adminList(schoolId: string) { return this.db.complaint.findMany({ where: { schoolId }, include: adminInclude, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }); }

  async context(userId: string, schoolId: string) {
    const enrollment = await this.db.courseEnrollment.findFirst({ where: { customer: { userId, schoolId } }, orderBy: { createdAt: "desc" }, include: { lessons: { where: { endedAt: { not: null } }, select: { id: true, classNumber: true, startedAt: true, staff: { select: { id: true, staffCode: true, user: { select: { displayName: true } } } }, vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } } }, orderBy: { classNumber: "desc" } }, payments: { where: { status: { in: ["VERIFIED", "PARTIALLY_REFUNDED", "REFUNDED"] } }, select: { id: true, receiptNumber: true, amount: true, method: true, createdAt: true }, orderBy: { createdAt: "desc" } } } });
    if (!enrollment) throw new NotFoundException("Customer enrollment was not found");
    return { enrollmentId: enrollment.id, lessons: enrollment.lessons, payments: enrollment.payments };
  }

  async create(userId: string, schoolId: string, input: CreateComplaintDto) {
    const enrollment = await this.db.courseEnrollment.findFirst({ where: { customer: { userId, schoolId } }, orderBy: { createdAt: "desc" } });
    if (!enrollment) throw new NotFoundException("Customer enrollment was not found");
    await this.validateLinks(enrollment.id, schoolId, input);
    for (const attachment of input.attachments ?? []) if (!this.isCloudinaryUrl(attachment.url)) throw new BadRequestException("Attachment must come from the configured media service");
    return this.db.$transaction(async transaction => {
      const complaint = await transaction.complaint.create({ data: { schoolId, enrollmentId: enrollment.id, customerUserId: userId, subject: input.subject.trim(), description: input.description.trim(), lessonId: input.lessonId || null, staffId: input.staffId || null, vehicleId: input.vehicleId || null, paymentId: input.paymentId || null, attachments: input.attachments?.length ? { create: input.attachments } : undefined }, include: customerInclude });
      await transaction.auditLog.create({ data: { schoolId, actorUserId: userId, action: "complaint.submitted", entityType: "Complaint", entityId: complaint.id, metadata: { linkedLessonId: input.lessonId, linkedPaymentId: input.paymentId, attachmentCount: input.attachments?.length ?? 0 } } });
      return complaint;
    });
  }

  async customerReply(userId: string, schoolId: string, id: string, input: ComplaintReplyDto) {
    if (input.private) throw new BadRequestException("Customers cannot create private notes");
    const complaint = await this.db.complaint.findFirst({ where: { id, schoolId, customerUserId: userId } });
    if (!complaint) throw new NotFoundException("Complaint was not found");
    if (["RESOLVED", "CLOSED"].includes(complaint.status)) throw new BadRequestException("Resolved complaints cannot receive replies");
    return this.addMessage(complaint, userId, input.body, false, "complaint.customer_replied");
  }

  async adminReply(schoolId: string, userId: string, id: string, input: ComplaintReplyDto) {
    const complaint = await this.db.complaint.findFirst({ where: { id, schoolId } });
    if (!complaint) throw new NotFoundException("Complaint was not found");
    return this.addMessage(complaint, userId, input.body, Boolean(input.private), input.private ? "complaint.private_note_added" : "complaint.admin_replied");
  }

  async update(schoolId: string, userId: string, id: string, input: UpdateComplaintDto) {
    const complaint = await this.db.complaint.findFirst({ where: { id, schoolId } });
    if (!complaint) throw new NotFoundException("Complaint was not found");
    if (input.status === "RESOLVED" && !input.resolutionOutcome?.trim() && !complaint.resolutionOutcome) throw new BadRequestException("Resolution outcome is required when resolving a complaint");
    const resolved = input.status === "RESOLVED" || input.status === "CLOSED";
    return this.db.$transaction(async transaction => {
      const updated = await transaction.complaint.update({ where: { id }, data: { status: input.status, priority: input.priority, resolutionOutcome: input.resolutionOutcome?.trim(), ...(input.status ? { resolvedAt: resolved ? complaint.resolvedAt ?? new Date() : null } : {}) }, include: adminInclude });
      await transaction.auditLog.create({ data: { schoolId, actorUserId: userId, action: "complaint.updated", entityType: "Complaint", entityId: id, metadata: { fromStatus: complaint.status, status: updated.status, priority: updated.priority, resolutionOutcome: input.resolutionOutcome } } });
      return updated;
    });
  }

  attachmentSignature() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME, apiKey = process.env.CLOUDINARY_API_KEY, secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !secret) throw new ServiceUnavailableException("Complaint attachments are not configured");
    const timestamp = Math.floor(Date.now() / 1000), folder = "sri-sai-anu/complaints";
    const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
    return { cloudName, apiKey, timestamp, folder, signature };
  }

  private async validateLinks(enrollmentId: string, schoolId: string, input: CreateComplaintDto) {
    if (input.lessonId) {
      const lesson = await this.db.lesson.findFirst({ where: { id: input.lessonId, enrollmentId, schoolId } });
      if (!lesson || input.staffId && lesson.staffId !== input.staffId || input.vehicleId && lesson.vehicleId !== input.vehicleId) throw new BadRequestException("Lesson, driver, or vehicle link does not belong to this customer");
    } else if (input.staffId || input.vehicleId) throw new BadRequestException("Select a lesson before linking its driver or vehicle");
    if (input.paymentId && !await this.db.payment.findFirst({ where: { id: input.paymentId, enrollmentId, schoolId } })) throw new BadRequestException("Payment link does not belong to this customer");
  }
  private async addMessage(complaint: { id: string; schoolId: string }, userId: string, body: string, privateNote: boolean, action: string) { return this.db.$transaction(async transaction => { const message = await transaction.complaintMessage.create({ data: { complaintId: complaint.id, authorUserId: userId, body: body.trim(), visibility: privateNote ? "PRIVATE" : "PUBLIC" }, include: { author: { select: { id: true, displayName: true } } } }); await transaction.auditLog.create({ data: { schoolId: complaint.schoolId, actorUserId: userId, action, entityType: "ComplaintMessage", entityId: message.id, metadata: { complaintId: complaint.id, visibility: message.visibility } } }); if(action==="complaint.admin_replied"&&!privateNote){const record=await transaction.complaint.findUniqueOrThrow({where:{id:complaint.id},include:{customer:{select:{id:true,displayName:true,phone:true,email:true}}}}),customer=record.customer;await queueNotifications(transaction,{schoolId:complaint.schoolId,userId:customer.id,eventType:"COMPLAINT_REPLY",eventId:message.id,phone:customer.phone,email:customer.email,payload:{subject:"New reply to your complaint",text:`${customer.displayName}, the school replied to your complaint: ${body.trim()}`,values:[customer.displayName,record.subject]}});} return message; }); }
  private isCloudinaryUrl(value: string) { try { return new URL(value).protocol === "https:" && new URL(value).hostname === "res.cloudinary.com"; } catch { return false; } }
}
