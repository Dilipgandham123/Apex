import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { DatabaseService } from "../database.service";
import type { CreateCourseDto, CreateCustomerEnrollmentDto } from "./registration.dto";

@Injectable()
export class RegistrationService {
  constructor(private readonly db: DatabaseService) {}

  courses(schoolId: string) {
    return this.db.course.findMany({ where: { schoolId }, orderBy: [{ active: "desc" }, { name: "asc" }] });
  }

  async createCourse(schoolId: string, actorUserId: string, input: CreateCourseDto) {
    const code = input.code.trim().toUpperCase();
    const duplicate = await this.db.course.findUnique({ where: { schoolId_code: { schoolId, code } } });
    if (duplicate) throw new ConflictException("A course with this code already exists");
    return this.db.$transaction(async transaction => {
      const course = await transaction.course.create({ data: { ...input, code, name: input.name.trim(), schoolId } });
      await transaction.auditLog.create({ data: { schoolId, actorUserId, action: "course.created", entityType: "Course", entityId: course.id } });
      return course;
    });
  }

  customers(schoolId: string) {
    return this.db.customerProfile.findMany({
      where: { schoolId },
      include: { user: { select: { displayName: true, phone: true, email: true } }, enrollments: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });
  }

  async createCustomerEnrollment(schoolId: string, actorUserId: string, input: CreateCustomerEnrollmentDto) {
    const course = await this.db.course.findFirst({ where: { id: input.courseId, schoolId, active: true } });
    if (!course) throw new NotFoundException("The selected active course was not found");
    const email = input.email?.trim().toLowerCase() || null;
    const existing = await this.db.user.findFirst({ where: { OR: [{ phone: input.phone }, ...(email ? [{ email }] : [])] } });
    if (existing) throw new ConflictException("A customer with this mobile number or email already exists");

    const price = Number(course.price);
    const totalPayable = price - input.discountAmount;
    if (totalPayable < 0) throw new BadRequestException("Discount cannot exceed the course price");
    if (input.initialPaid > totalPayable) throw new BadRequestException("Initial payment cannot exceed the total payable amount");
    const customerRole = await this.db.role.findUnique({ where: { key: "CUSTOMER" } });
    if (!customerRole) throw new BadRequestException("Customer role is not configured");

    return this.db.$transaction(async transaction => {
      const user = await transaction.user.create({ data: { displayName: input.displayName.trim(), phone: input.phone, email } });
      await transaction.schoolMembership.create({ data: { userId: user.id, schoolId, roleId: customerRole.id } });
      const customer = await transaction.customerProfile.create({
        data: {
          userId: user.id,
          schoolId,
          customerCode: `SSA-${randomBytes(3).toString("hex").toUpperCase()}`,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          address: input.address?.trim() || null,
        },
      });
      const enrollment = await transaction.courseEnrollment.create({
        data: {
          customerId: customer.id,
          courseId: course.id,
          courseNameSnapshot: course.name,
          priceSnapshot: course.price,
          classCountSnapshot: course.classCount,
          targetKmPerClassSnapshot: course.targetKmPerClass,
          durationDaysSnapshot: course.durationDays,
          discountAmount: input.discountAmount,
          totalPayable,
          initialPaid: input.initialPaid,
        },
      });
      await transaction.auditLog.create({
        data: { schoolId, actorUserId, action: "customer.enrolled", entityType: "CourseEnrollment", entityId: enrollment.id, metadata: { customerId: customer.id, customerCode: customer.customerCode } },
      });
      return { customer: { ...customer, user }, enrollment, pendingAmount: totalPayable - input.initialPaid };
    });
  }
}
