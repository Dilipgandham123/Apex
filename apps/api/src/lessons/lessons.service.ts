import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@hyd/database";
import { DatabaseService } from "../database.service";
import type { EndLessonDto, StartLessonDto } from "./lessons.dto";
import { queueNotifications } from "../notifications/notification-outbox";

const completedStatuses = ["COMPLETED", "COMPLETED_WITH_SHORTFALL"] as const;

@Injectable()
export class LessonsService {
  constructor(private readonly db: DatabaseService) {}

  async searchCustomers(schoolId: string, query: string) {
    const value = query.trim();
    const customers = await this.db.customerProfile.findMany({
      where: { schoolId, status: "REGISTERED", OR: [{ customerCode: { contains: value, mode: "insensitive" } }, { user: { displayName: { contains: value, mode: "insensitive" } } }, { user: { phone: { contains: value } } }] },
      include: { user: { select: { displayName: true, phone: true } }, enrollments: { where: { status: { in: ["NOT_STARTED", "ACTIVE"] } }, orderBy: { createdAt: "desc" }, include: { _count: { select: { lessons: { where: { status: { in: [...completedStatuses] } } } } } } } },
      take: 10,
    });
    return Promise.all(customers.flatMap(customer => customer.enrollments.slice(0, 1).map(async enrollment => ({
      customerId: customer.id, customerCode: customer.customerCode, displayName: customer.user.displayName, phone: customer.user.phone,
      enrollmentId: enrollment.id, courseName: enrollment.courseNameSnapshot, classesCompleted: enrollment._count.lessons,
      classesTotal: enrollment.classCountSnapshot, targetKm: enrollment.targetKmPerClassSnapshot, pendingKm: await this.pendingKm(this.db, enrollment.id), deadlineAt: enrollment.deadlineAt,
    }))));
  }

  async active(userId: string, schoolId: string) {
    const staff = await this.staff(userId, schoolId);
    return this.db.lesson.findFirst({ where: { staffId: staff.id, status: "ACTIVE" }, include: this.lessonDetails() });
  }

  async history(userId: string, schoolId: string) {
    const staff = await this.staff(userId, schoolId);
    return this.db.lesson.findMany({ where: { staffId: staff.id, status: { in: [...completedStatuses] } }, include: this.lessonDetails(), orderBy: { endedAt: "desc" }, take: 50 });
  }

  async start(userId: string, schoolId: string, input: StartLessonDto) {
    try {
      return await this.db.$transaction(async transaction => {
        const staff = await transaction.staffProfile.findFirst({ where: { userId, schoolId, status: "ACTIVE" }, include: { user: true, vehicleAssignments: { where: { endedAt: null }, include: { vehicle: true } } } });
        const assignment = staff?.vehicleAssignments[0];
        if (!staff?.user.active || !assignment) throw new BadRequestException("An active assigned vehicle is required");
        if (staff.licenceExpiresAt < this.today()) throw new BadRequestException("Driving licence has expired");
        if (assignment.vehicle.status !== "AVAILABLE") throw new BadRequestException("Assigned vehicle is not available");
        const enrollment = await transaction.courseEnrollment.findFirst({ where: { id: input.enrollmentId, customer: { schoolId }, status: { in: ["NOT_STARTED", "ACTIVE"] } }, include: { customer: true, lessons: { where: { status: { in: [...completedStatuses] } }, select: { classNumber: true } } } });
        if (!enrollment) throw new NotFoundException("Eligible customer enrollment was not found");
        if (enrollment.deadlineAt && enrollment.deadlineAt < new Date()) throw new BadRequestException("The 60-day training window has expired; an admin extension is required");
        if (enrollment.lessons.length >= enrollment.classCountSnapshot) throw new BadRequestException("All entitled classes are already completed");
        if (new Prisma.Decimal(input.startOdometerKm).lessThan(assignment.vehicle.odometerKm)) throw new BadRequestException("Starting odometer cannot be lower than the vehicle record");
        const classNumber = Math.max(0, ...enrollment.lessons.map(lesson => lesson.classNumber)) + 1;
        const pendingKmBefore = await this.pendingKm(transaction, enrollment.id);
        const lesson = await transaction.lesson.create({ data: {
          schoolId, customerId: enrollment.customerId, enrollmentId: enrollment.id, staffId: staff.id, vehicleId: assignment.vehicle.id,
          classNumber, normalTargetKm: enrollment.targetKmPerClassSnapshot, pendingKmBefore, totalTargetKm: enrollment.targetKmPerClassSnapshot.plus(pendingKmBefore),
          startOdometerKm: input.startOdometerKm, startEvidenceUrl: input.startEvidenceUrl,
        }, include: this.lessonDetails() });
        if (new Prisma.Decimal(input.startOdometerKm).greaterThan(assignment.vehicle.odometerKm)) await transaction.vehicle.update({ where: { id: assignment.vehicle.id }, data: { odometerKm: input.startOdometerKm } });
        await transaction.auditLog.create({ data: { schoolId, actorUserId: userId, action: "lesson.started", entityType: "Lesson", entityId: lesson.id, metadata: { classNumber, customerId: enrollment.customerId, vehicleId: assignment.vehicle.id } } });
        return lesson;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("Customer, driver, vehicle, or class already has an active lesson");
      throw error;
    }
  }

  async end(userId: string, schoolId: string, lessonId: string, input: EndLessonDto) {
    const lesson = await this.db.lesson.findFirst({ where: { id: lessonId, schoolId, status: "ACTIVE", staff: { userId } }, include: { enrollment: true, vehicle: true } });
    if (!lesson) throw new NotFoundException("Active lesson was not found");
    const end = new Prisma.Decimal(input.endOdometerKm);
    if (end.lessThan(lesson.startOdometerKm)) throw new BadRequestException("Ending odometer cannot be lower than starting odometer");
    const covered = end.minus(lesson.startOdometerKm);
    const newShortfall = Prisma.Decimal.max(new Prisma.Decimal(0), lesson.normalTargetKm.minus(covered));
    const recoveryAvailable = Prisma.Decimal.max(new Prisma.Decimal(0), covered.minus(lesson.normalTargetKm));
    const skills = [...new Set(input.skills.map(skill => skill.trim()).filter(Boolean))];
    const endedAt = new Date();
    return this.db.$transaction(async transaction => {
      const ledger = await transaction.kilometreLedgerEntry.findMany({ where: { enrollmentId: lesson.enrollmentId }, orderBy: { createdAt: "asc" } });
      let recoveryRemaining = Prisma.Decimal.min(recoveryAvailable, lesson.pendingKmBefore);
      const recoveries: Array<{ schoolId: string; enrollmentId: string; type: "RECOVERY"; amountKm: Prisma.Decimal; shortfallLessonId: string; recoveryLessonId: string }> = [];
      for (const entry of ledger.filter(item => item.type === "SHORTFALL" && item.shortfallLessonId)) {
        if (recoveryRemaining.lessThanOrEqualTo(0)) break;
        const recovered = ledger.filter(item => item.type === "RECOVERY" && item.shortfallLessonId === entry.shortfallLessonId).reduce((sum, item) => sum.plus(item.amountKm), new Prisma.Decimal(0));
        const amount = Prisma.Decimal.min(entry.amountKm.minus(recovered), recoveryRemaining);
        if (amount.greaterThan(0)) { recoveries.push({ schoolId, enrollmentId: lesson.enrollmentId, type: "RECOVERY", amountKm: amount, shortfallLessonId: entry.shortfallLessonId!, recoveryLessonId: lesson.id }); recoveryRemaining = recoveryRemaining.minus(amount); }
      }
      const recoveredKm = recoveries.reduce((sum, item) => sum.plus(item.amountKm), new Prisma.Decimal(0));
      const pendingAfter = lesson.pendingKmBefore.minus(recoveredKm).plus(newShortfall);
      const status = pendingAfter.greaterThan(0) ? "COMPLETED_WITH_SHORTFALL" : "COMPLETED";
      const claimed = await transaction.lesson.updateMany({ where: { id: lesson.id, status: "ACTIVE" }, data: {
        status, endOdometerKm: end, coveredKm: covered, shortfallKm: pendingAfter, endedAt,
        endEvidenceUrl: input.endEvidenceUrl, customerSummary: input.customerSummary?.trim() || null, privateNote: input.privateNote?.trim() || null,
      } });
      if (claimed.count !== 1) throw new ConflictException("Lesson was already completed");
      if (skills.length) await transaction.lessonSkill.createMany({ data: skills.map(name => ({ lessonId: lesson.id, name })) });
      if (newShortfall.greaterThan(0)) await transaction.kilometreLedgerEntry.create({ data: { schoolId, enrollmentId: lesson.enrollmentId, type: "SHORTFALL", amountKm: newShortfall, shortfallLessonId: lesson.id } });
      if (recoveries.length) await transaction.kilometreLedgerEntry.createMany({ data: recoveries });
      await transaction.vehicle.update({ where: { id: lesson.vehicleId }, data: { odometerKm: end } });
      const firstClass = lesson.classNumber === 1 && !lesson.enrollment.firstLessonAt;
      const finalClass = lesson.classNumber >= lesson.enrollment.classCountSnapshot && pendingAfter.equals(0);
      await transaction.courseEnrollment.update({ where: { id: lesson.enrollmentId }, data: {
        status: finalClass ? "COMPLETED" : "ACTIVE",
        ...(firstClass ? { firstLessonAt: endedAt, deadlineAt: new Date(endedAt.getTime() + lesson.enrollment.durationDaysSnapshot * 86400000) } : {}),
      } });
      await transaction.auditLog.create({ data: { schoolId, actorUserId: userId, action: "lesson.completed", entityType: "Lesson", entityId: lesson.id, metadata: { coveredKm: covered.toString(), newShortfallKm: newShortfall.toString(), recoveredKm: recoveredKm.toString(), pendingKm: pendingAfter.toString(), status } } });
      if (finalClass) {
        const enrollment = await transaction.courseEnrollment.findUniqueOrThrow({ where: { id: lesson.enrollmentId }, include: { customer: { include: { user: { select: { id: true, displayName: true, phone: true, email: true } } } } } });
        const customer = enrollment.customer.user;
        await queueNotifications(transaction, { schoolId, userId: customer.id, eventType: "COURSE_COMPLETED", eventId: enrollment.id, phone: customer.phone, email: customer.email, payload: { subject: "Driving course completed", text: `${customer.displayName}, you completed ${enrollment.courseNameSnapshot}. All ${enrollment.classCountSnapshot} classes and pending kilometres are complete.`, values: [customer.displayName, enrollment.courseNameSnapshot, String(enrollment.classCountSnapshot)] } });
      }
      return transaction.lesson.findUniqueOrThrow({ where: { id: lesson.id }, include: this.lessonDetails() });
    });
  }

  private staff(userId: string, schoolId: string) { return this.db.staffProfile.findFirstOrThrow({ where: { userId, schoolId, status: "ACTIVE" } }); }
  private async pendingKm(client: Pick<DatabaseService, "kilometreLedgerEntry">, enrollmentId: string) {
    const entries = await client.kilometreLedgerEntry.findMany({ where: { enrollmentId }, select: { type: true, amountKm: true, adjustmentKm: true } });
    return Prisma.Decimal.max(new Prisma.Decimal(0), entries.reduce((sum, entry) => entry.type === "SHORTFALL" ? sum.plus(entry.amountKm) : entry.type === "RECOVERY" ? sum.minus(entry.amountKm) : sum.plus(entry.adjustmentKm ?? 0), new Prisma.Decimal(0)));
  }
  private today() { const date = new Date(); date.setHours(0, 0, 0, 0); return date; }
  private lessonDetails() { return { customer: { include: { user: { select: { displayName: true, phone: true } } } }, enrollment: true, vehicle: true, staff: { include: { user: { select: { displayName: true } } } }, skills: true } as const; }
}
