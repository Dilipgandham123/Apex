import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database.service";
import type { CreateEnquiryDto, UpdateEnquiryDto } from "./enquiries.dto";

@Injectable()
export class EnquiriesService {
  constructor(private readonly db: DatabaseService) {}

  async create(input: CreateEnquiryDto, ipAddress?: string, userAgent?: string) {
    if (input.website) throw new BadRequestException("Enquiry could not be submitted");
    const school = await this.db.drivingSchool.findUnique({ where: { slug: input.schoolSlug }, select: { id: true } });
    if (!school) throw new NotFoundException("School is not accepting website enquiries");
    const enquiry = await this.db.publicEnquiry.create({ data: {
      schoolId: school.id,
      name: input.name.trim(), phone: input.phone.trim(), course: input.course.trim(), preferredSlot: input.preferredSlot.trim(),
      notes: input.notes?.trim() || null, ipAddress, userAgent: userAgent?.slice(0, 500),
    } });
    await this.db.auditLog.create({ data: { schoolId: school.id, action: "enquiry.created", entityType: "PublicEnquiry", entityId: enquiry.id, metadata: { source: enquiry.source } } });
    return { id: enquiry.id, createdAt: enquiry.createdAt };
  }

  list(schoolId: string) {
    return this.db.publicEnquiry.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } });
  }

  async update(schoolId: string, actorUserId: string, id: string, input: UpdateEnquiryDto) {
    const existing = await this.db.publicEnquiry.findFirst({ where: { id, schoolId } });
    if (!existing) throw new NotFoundException("Enquiry not found");
    const enquiry = await this.db.publicEnquiry.update({ where: { id }, data: { status: input.status } });
    await this.db.auditLog.create({ data: { schoolId, actorUserId, action: "enquiry.status_updated", entityType: "PublicEnquiry", entityId: id, metadata: { from: existing.status, to: input.status } } });
    return enquiry;
  }
}
