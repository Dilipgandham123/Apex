import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@hyd/database";
import { DatabaseService } from "../database.service";

const settled = ["VERIFIED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;
@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async adminDashboard(schoolId: string) {
    const start = this.startOfDay(), soon = new Date(start.getTime() + 7 * 86400000), warning = new Date(start.getTime() + 30 * 86400000);
    const [activeLessons, lessonsToday, staff, vehicles, enrollments, complaints] = await Promise.all([
      this.db.lesson.findMany({ where: { schoolId, status: "ACTIVE" }, include: { customer: { include: { user: { select: { displayName: true } } } }, staff: { include: { user: { select: { displayName: true } } } }, vehicle: true }, orderBy: { startedAt: "asc" } }),
      this.db.lesson.findMany({ where: { schoolId, startedAt: { gte: start } }, select: { coveredKm: true, customerId: true } }),
      this.db.staffProfile.findMany({ where: { schoolId }, include: { user: { select: { displayName: true } }, vehicleAssignments: { where: { endedAt: null } } } }),
      this.db.vehicle.findMany({ where: { schoolId }, include: { issues: { where: { status: "OPEN" } } } }),
      this.enrollments(schoolId),
      this.db.complaint.findMany({ where: { schoolId, status: { in: ["SUBMITTED", "IN_REVIEW", "WAITING_CUSTOMER"] } }, include: { customer: { select: { displayName: true } } }, orderBy: { createdAt: "asc" } }),
    ]);
    const enrollmentRows = enrollments.map(row => this.enrollmentRow(row));
    const expiring = enrollmentRows.filter(row => row.status === "ACTIVE" && row.deadlineAt && new Date(row.deadlineAt) <= soon);
    const vehicleWarnings = vehicles.filter(vehicle => vehicle.status !== "AVAILABLE" || vehicle.issues.length || vehicle.insuranceExpiresAt && vehicle.insuranceExpiresAt <= warning || vehicle.pucExpiresAt && vehicle.pucExpiresAt <= warning).map(vehicle => ({ id: vehicle.id, registrationNumber: vehicle.registrationNumber, status: vehicle.status, openIssues: vehicle.issues.length, insuranceExpiresAt: vehicle.insuranceExpiresAt, pucExpiresAt: vehicle.pucExpiresAt }));
    return { generatedAt: new Date(), operations: { activeLessons: activeLessons.length, availableDrivers: staff.filter(item => item.status === "ACTIVE" && item.vehicleAssignments.length).length, availableVehicles: vehicles.filter(item => item.status === "AVAILABLE").length, customersToday: new Set(lessonsToday.map(item => item.customerId)).size, classesToday: lessonsToday.length, kilometresToday: this.sum(lessonsToday.map(item => item.coveredKm)).toString() }, activeLessons, exceptions: { pendingKilometres: enrollmentRows.filter(row => new Prisma.Decimal(row.pendingKm).greaterThan(0)), expiring, expired: enrollmentRows.filter(row => row.status === "EXPIRED"), pendingPayments: enrollmentRows.filter(row => new Prisma.Decimal(row.pendingAmount).greaterThan(0)), openComplaints: complaints, vehicleWarnings }, totals: { pendingKilometres: this.sum(enrollmentRows.map(row => row.pendingKm)).toString(), pendingPayments: this.sum(enrollmentRows.map(row => row.pendingAmount)).toString(), openComplaints: complaints.length, vehicleWarnings: vehicleWarnings.length } };
  }

  async staffDashboard(userId: string, schoolId: string) {
    const start = this.startOfDay();
    const staff = await this.db.staffProfile.findFirst({ where: { userId, schoolId }, include: { user: { select: { displayName: true } }, vehicleAssignments: { where: { endedAt: null }, include: { vehicle: { include: { issues: { where: { status: "OPEN" } } } } } } } });
    if (!staff) throw new NotFoundException("Staff profile was not found");
    const [activeLesson, lessons] = await Promise.all([
      this.db.lesson.findFirst({ where: { schoolId, staffId: staff.id, status: "ACTIVE" }, include: { customer: { include: { user: { select: { displayName: true } } } }, vehicle: true } }),
      this.db.lesson.findMany({ where: { schoolId, staffId: staff.id, startedAt: { gte: start } }, include: { customer: { include: { user: { select: { displayName: true } } } }, vehicle: true }, orderBy: { startedAt: "desc" } }),
    ]);
    return { generatedAt: new Date(), staff: { displayName: staff.user.displayName, staffCode: staff.staffCode }, vehicle: staff.vehicleAssignments[0]?.vehicle ?? null, activeLesson, today: { customers: new Set(lessons.map(item => item.customerId)).size, classes: lessons.length, kilometres: this.sum(lessons.map(item => item.coveredKm)).toString(), shortfallClasses: lessons.filter(item => item.status === "COMPLETED_WITH_SHORTFALL").length }, recentLessons: lessons.slice(0, 8) };
  }

  async report(schoolId: string) {
    const [enrollments, lessons, staff, vehicles, payments, complaints, extensions] = await Promise.all([
      this.enrollments(schoolId),
      this.db.lesson.findMany({ where: { schoolId, status: { not: "ACTIVE" } }, include: { customer: { include: { user: { select: { displayName: true } } } }, staff: { include: { user: { select: { displayName: true } } } }, vehicle: true }, orderBy: { endedAt: "desc" } }),
      this.db.staffProfile.findMany({ where: { schoolId }, include: { user: { select: { displayName: true } }, vehicleAssignments: { where: { endedAt: null }, include: { vehicle: true } } } }),
      this.db.vehicle.findMany({ where: { schoolId }, include: { driverAssignments: { where: { endedAt: null }, include: { staff: { include: { user: { select: { displayName: true } } } } } }, issues: { where: { status: "OPEN" } } } }),
      this.db.payment.findMany({ where: { schoolId, status: { in: [...settled] } }, include: { refunds: { where: { status: "PROCESSED" } } }, orderBy: { createdAt: "desc" } }),
      this.db.complaint.findMany({ where: { schoolId }, include: { customer: { select: { displayName: true } } }, orderBy: { createdAt: "desc" } }),
      this.db.deadlineExtension.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } }),
    ]);
    // ponytail: in-memory aggregation fits the current single-school volume; move to SQL views when report payloads exceed practical API response size.
    const customerRows = enrollments.map(row => this.enrollmentRow(row));
    const group = <T>(rows: T[], key: (row: T) => string, amount: (row: T) => Prisma.Decimal) => [...rows.reduce((map, row) => { const name = key(row), current = map.get(name) ?? { name, count: 0, amount: new Prisma.Decimal(0) }; current.count++; current.amount = current.amount.plus(amount(row)); return map.set(name, current); }, new Map<string, { name: string; count: number; amount: Prisma.Decimal }>()).values()].map(item => ({ name: item.name, count: item.count, amount: item.amount.toString() })).sort((a, b) => b.count - a.count);
    const days = group(lessons, row => row.endedAt?.toISOString().slice(0, 10) ?? "Unknown", row => new Prisma.Decimal(row.coveredKm ?? 0)).sort((a, b) => a.name.localeCompare(b.name));
    const paid = this.sum(payments.map(item => item.amount.minus(item.refundedAmount)));
    const pending = this.sum(customerRows.map(item => item.pendingAmount));
    const resolved = complaints.filter(item => item.resolvedAt);
    return { generatedAt: new Date(), summary: { customers: customerRows.length, completedCustomers: customerRows.filter(item => item.status === "COMPLETED").length, lessons: lessons.length, kilometres: this.sum(lessons.map(item => item.coveredKm)).toString(), revenue: paid.toString(), pendingPayments: pending.toString(), openComplaints: complaints.filter(item => !["RESOLVED", "CLOSED"].includes(item.status)).length }, customerRows, lessonRows: lessons, lessonsByDay: days, kilometresByDriver: group(lessons, row => row.staff.user.displayName, row => new Prisma.Decimal(row.coveredKm ?? 0)), kilometresByVehicle: group(lessons, row => row.vehicle.registrationNumber, row => new Prisma.Decimal(row.coveredKm ?? 0)), kilometresByCustomer: group(lessons, row => row.customer.user.displayName, row => new Prisma.Decimal(row.coveredKm ?? 0)), staffRows: staff, vehicleRows: vehicles, paymentRows: payments, paymentMethods: group(payments, row => row.method, row => row.amount.minus(row.refundedAmount)), complaintRows: complaints, complaintStatuses: group(complaints, row => row.status, () => new Prisma.Decimal(0)), averageResolutionHours: resolved.length ? Math.round(resolved.reduce((sum, item) => sum + (item.resolvedAt!.getTime() - item.createdAt.getTime()) / 3600000, 0) / resolved.length) : null, deadlineExtensions: extensions.length };
  }

  private enrollments(schoolId: string) { return this.db.courseEnrollment.findMany({ where: { customer: { schoolId } }, include: { customer: { include: { user: { select: { displayName: true, phone: true } } } }, lessons: { where: { status: { not: "ACTIVE" } }, select: { coveredKm: true } }, kilometreEntries: { select: { type: true, amountKm: true, adjustmentKm: true } }, payments: { select: { status: true, amount: true, refundedAmount: true } } }, orderBy: { createdAt: "desc" } }); }
  private enrollmentRow(row: Awaited<ReturnType<ReportsService["enrollments"]>>[number]) { const paid = this.sum(row.payments.filter(item => settled.includes(item.status as typeof settled[number])).map(item => item.amount.minus(item.refundedAmount))), pendingKm = row.kilometreEntries.reduce((sum, item) => item.type === "SHORTFALL" ? sum.plus(item.amountKm) : item.type === "RECOVERY" ? sum.minus(item.amountKm) : sum.plus(item.adjustmentKm ?? 0), new Prisma.Decimal(0)); return { id: row.id, customerCode: row.customer.customerCode, customerName: row.customer.user.displayName, phone: row.customer.user.phone, courseName: row.courseNameSnapshot, status: row.status, classesCompleted: row.lessons.length, classesTotal: row.classCountSnapshot, kilometres: this.sum(row.lessons.map(item => item.coveredKm)).toString(), pendingKm: Prisma.Decimal.max(0, pendingKm).toString(), paidAmount: paid.toString(), pendingAmount: Prisma.Decimal.max(0, row.totalPayable.minus(paid)).toString(), deadlineAt: row.deadlineAt }; }
  private sum(values: Array<Prisma.Decimal | string | number | null>) { return values.reduce<Prisma.Decimal>((sum, value) => sum.plus(value ?? 0), new Prisma.Decimal(0)); }
  private startOfDay() { const date = new Date(); date.setHours(0, 0, 0, 0); return date; }
}
