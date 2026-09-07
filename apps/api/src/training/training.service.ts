import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@hyd/database";
import { DatabaseService } from "../database.service";
import type { AdjustKilometresDto, ExtendDeadlineDto } from "./training.dto";

@Injectable()
export class TrainingService {
  constructor(private readonly db: DatabaseService) {}

  async enrollments(schoolId: string) {
    const now = new Date();
    await this.db.courseEnrollment.updateMany({ where: { customer: { schoolId }, status: "ACTIVE", deadlineAt: { lt: now } }, data: { status: "EXPIRED" } });
    const rows = await this.db.courseEnrollment.findMany({
      where: { customer: { schoolId }, status: { in: ["ACTIVE", "EXPIRED"] } },
      include: { customer: { include: { user: { select: { displayName: true, phone: true } } } }, lessons: { where: { status: { in: ["COMPLETED", "COMPLETED_WITH_SHORTFALL"] } }, orderBy: { classNumber: "asc" }, select: { id: true, classNumber: true, coveredKm: true, staff: { select: { user: { select: { displayName: true } } } } } }, kilometreEntries: { orderBy: { createdAt: "asc" } }, deadlineExtensions: { orderBy: { createdAt: "desc" } } },
      orderBy: [{ deadlineAt: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(row => ({ ...row, pendingKm: this.pending(row.kilometreEntries).toString(), completedKm: row.lessons.reduce((sum, lesson) => sum.plus(lesson.coveredKm ?? 0), new Prisma.Decimal(0)).toString(), daysRemaining: row.deadlineAt ? Math.ceil((row.deadlineAt.getTime() - now.getTime()) / 86400000) : null }));
  }

  async extend(schoolId: string, userId: string, enrollmentId: string, input: ExtendDeadlineDto) {
    const enrollment = await this.db.courseEnrollment.findFirst({ where: { id: enrollmentId, customer: { schoolId } } });
    if (!enrollment?.deadlineAt || !enrollment.firstLessonAt) throw new NotFoundException("Started enrollment with a deadline was not found");
    const next = new Date(input.newDeadline);
    if (next <= enrollment.deadlineAt) throw new BadRequestException("New deadline must be later than the current deadline");
    return this.db.$transaction(async transaction => {
      const extension = await transaction.deadlineExtension.create({ data: { schoolId, enrollmentId, previousDeadline: enrollment.deadlineAt!, newDeadline: next, reason: input.reason.trim(), createdByUserId: userId } });
      await transaction.courseEnrollment.update({ where: { id: enrollmentId }, data: { deadlineAt: next, status: "ACTIVE" } });
      await transaction.auditLog.create({ data: { schoolId, actorUserId: userId, action: "enrollment.deadline_extended", entityType: "CourseEnrollment", entityId: enrollmentId, metadata: { previousDeadline: enrollment.deadlineAt, newDeadline: next, reason: input.reason.trim() } } });
      return extension;
    });
  }

  async adjust(schoolId: string, userId: string, enrollmentId: string, input: AdjustKilometresDto) {
    const enrollment = await this.db.courseEnrollment.findFirst({ where: { id: enrollmentId, customer: { schoolId } }, include: { kilometreEntries: true } });
    if (!enrollment) throw new NotFoundException("Enrollment was not found");
    const adjustment = new Prisma.Decimal(input.adjustmentKm);
    if (this.pending(enrollment.kilometreEntries).plus(adjustment).lessThan(0)) throw new BadRequestException("Adjustment cannot reduce pending kilometres below zero");
    return this.db.$transaction(async transaction => {
      const entry = await transaction.kilometreLedgerEntry.create({ data: { schoolId, enrollmentId, type: "ADJUSTMENT", amountKm: adjustment.abs(), adjustmentKm: adjustment, reason: input.reason.trim(), createdByUserId: userId } });
      await transaction.auditLog.create({ data: { schoolId, actorUserId: userId, action: "kilometres.adjusted", entityType: "CourseEnrollment", entityId: enrollmentId, metadata: { adjustmentKm: adjustment.toString(), reason: input.reason.trim(), ledgerEntryId: entry.id } } });
      return entry;
    });
  }

  private pending(entries: Array<{ type: string; amountKm: Prisma.Decimal; adjustmentKm: Prisma.Decimal | null }>) {
    return Prisma.Decimal.max(0, entries.reduce((sum, entry) => entry.type === "SHORTFALL" ? sum.plus(entry.amountKm) : entry.type === "RECOVERY" ? sum.minus(entry.amountKm) : sum.plus(entry.adjustmentKm ?? 0), new Prisma.Decimal(0)));
  }
}
