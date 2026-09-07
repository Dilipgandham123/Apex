import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@hyd/database";
import { DatabaseService } from "../database.service";

@Injectable()
export class CustomerService {
  constructor(private readonly db: DatabaseService) {}

  async overview(userId: string, schoolId: string) {
    const customer = await this.db.customerProfile.findFirst({
      where: { userId, schoolId, status: "REGISTERED" },
      include: { user: { select: { displayName: true, phone: true } }, enrollments: { orderBy: { createdAt: "desc" }, take: 1, include: {
        lessons: { where: { status: { in: ["COMPLETED", "COMPLETED_WITH_SHORTFALL"] } }, orderBy: { classNumber: "desc" }, select: { id: true, classNumber: true, status: true, normalTargetKm: true, pendingKmBefore: true, totalTargetKm: true, startOdometerKm: true, endOdometerKm: true, coveredKm: true, shortfallKm: true, customerSummary: true, startedAt: true, endedAt: true, staff: { select: { staffCode: true, user: { select: { displayName: true } } } }, vehicle: { select: { registrationNumber: true, make: true, model: true } }, skills: { select: { name: true } } } },
        kilometreEntries: { orderBy: { createdAt: "desc" }, include: { shortfallLesson: { select: { classNumber: true, staff: { select: { user: { select: { displayName: true } } } } } }, recoveryLesson: { select: { classNumber: true, staff: { select: { user: { select: { displayName: true } } } } } } } },
        deadlineExtensions: { orderBy: { createdAt: "desc" }, select: { previousDeadline: true, newDeadline: true, reason: true, createdAt: true } },
        payments: { where: { status: { in: ["VERIFIED", "PARTIALLY_REFUNDED", "REFUNDED"] } }, orderBy: { createdAt: "desc" }, select: { amount: true, refundedAmount: true } },
      } } },
    });
    const enrollment = customer?.enrollments[0];
    if (!customer || !enrollment) throw new NotFoundException("Customer enrollment was not found");
    const completedKm = enrollment.lessons.reduce((sum, lesson) => sum.plus(lesson.coveredKm ?? 0), new Prisma.Decimal(0));
    const pendingKm = Prisma.Decimal.max(0, enrollment.kilometreEntries.reduce((sum, entry) => entry.type === "SHORTFALL" ? sum.plus(entry.amountKm) : entry.type === "RECOVERY" ? sum.minus(entry.amountKm) : sum.plus(entry.adjustmentKm ?? 0), new Prisma.Decimal(0)));
    const paid = enrollment.payments.reduce((sum, payment) => sum.plus(payment.amount).minus(payment.refundedAmount), new Prisma.Decimal(0));
    const now = new Date();
    return {
      customer: { customerCode: customer.customerCode, displayName: customer.user.displayName, phone: customer.user.phone },
      enrollment: {
        id: enrollment.id, status: enrollment.status, courseName: enrollment.courseNameSnapshot, classesTotal: enrollment.classCountSnapshot,
        classesCompleted: enrollment.lessons.length, classesRemaining: Math.max(0, enrollment.classCountSnapshot - enrollment.lessons.length),
        targetKmPerClass: enrollment.targetKmPerClassSnapshot.toString(), firstLessonAt: enrollment.firstLessonAt, deadlineAt: enrollment.deadlineAt,
        daysRemaining: enrollment.deadlineAt ? Math.max(0, Math.ceil((enrollment.deadlineAt.getTime() - now.getTime()) / 86400000)) : null,
        completedKm: completedKm.toString(), pendingKm: pendingKm.toString(), price: enrollment.priceSnapshot.toString(), discount: enrollment.discountAmount.toString(),
        totalPayable: enrollment.totalPayable.toString(), paid: paid.toString(), pendingAmount: Prisma.Decimal.max(0, enrollment.totalPayable.minus(paid)).toString(),
      },
      lessons: enrollment.lessons,
      kilometreEntries: enrollment.kilometreEntries,
      deadlineExtensions: enrollment.deadlineExtensions,
    };
  }
}
