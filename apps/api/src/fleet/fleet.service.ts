import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { DatabaseService } from "../database.service";
import { hashPassword } from "../auth/password";
import { Prisma } from "@hyd/database";
import type { RoleKey } from "../auth/auth.types";
import type { AssignVehicleDto, CreateStaffDto, CreateVehicleDto, ReportVehicleIssueDto, UpdateStaffStatusDto, UpdateVehicleStatusDto } from "./fleet.dto";

@Injectable()
export class FleetService {
  constructor(private readonly db: DatabaseService) {}

  staff(schoolId: string) {
    return this.db.staffProfile.findMany({
      where: { schoolId },
      include: { user: { select: { displayName: true, email: true, active: true } }, vehicleAssignments: { where: { endedAt: null }, include: { vehicle: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async createStaff(schoolId: string, actorUserId: string, input: CreateStaffDto) {
    if (!input.canDriveManual && !input.canDriveAutomatic) throw new BadRequestException("Select at least one transmission permission");
    const expiry = new Date(input.licenceExpiresAt);
    if (expiry < this.today()) throw new BadRequestException("Driving licence must not be expired");
    const email = input.email.trim().toLowerCase();
    const licenceNumber = input.licenceNumber.trim().toUpperCase();
    if (await this.db.user.findUnique({ where: { email } })) throw new ConflictException("A user with this email already exists");
    if (await this.db.staffProfile.findFirst({ where: { schoolId, licenceNumber } })) throw new ConflictException("This driving licence is already registered");
    const role = await this.db.role.findUnique({ where: { key: "STAFF" } });
    if (!role) throw new BadRequestException("Staff role is not configured");
    return this.db.$transaction(async transaction => {
      const user = await transaction.user.create({ data: { displayName: input.displayName.trim(), email, passwordHash: await hashPassword(input.password) } });
      await transaction.schoolMembership.create({ data: { userId: user.id, schoolId, roleId: role.id } });
      const profile = await transaction.staffProfile.create({ data: {
        userId: user.id, schoolId, staffCode: `DRV-${randomBytes(3).toString("hex").toUpperCase()}`,
        licenceNumber, licenceExpiresAt: expiry, canDriveManual: input.canDriveManual, canDriveAutomatic: input.canDriveAutomatic,
      } });
      await transaction.auditLog.create({ data: { schoolId, actorUserId, action: "staff.created", entityType: "StaffProfile", entityId: profile.id } });
      return { ...profile, user: { displayName: user.displayName, email: user.email, active: user.active }, vehicleAssignments: [] };
    });
  }

  async updateStaffStatus(schoolId: string, actorUserId: string, staffId: string, input: UpdateStaffStatusDto) {
    const staff = await this.db.staffProfile.findFirst({ where: { id: staffId, schoolId }, include: { user: true } });
    if (!staff) throw new NotFoundException("Staff member was not found");
    const active = input.status === "ACTIVE";
    if (!active && await this.db.lesson.findFirst({ where: { staffId: staff.id, status: "ACTIVE" } })) throw new BadRequestException("End the active lesson before deactivating this driver");
    return this.db.$transaction(async transaction => {
      await transaction.staffProfile.update({ where: { id: staff.id }, data: { status: input.status } });
      await transaction.schoolMembership.updateMany({ where: { userId: staff.userId, schoolId, role: { key: "STAFF" } }, data: { active } });
      if (!active) await transaction.driverVehicleAssignment.updateMany({ where: { staffId: staff.id, endedAt: null }, data: { endedAt: new Date() } });
      await transaction.auditLog.create({ data: { schoolId, actorUserId, action: "staff.status_changed", entityType: "StaffProfile", entityId: staff.id, metadata: { status: input.status } } });
      return { id: staff.id, status: input.status };
    });
  }

  vehicles(schoolId: string) {
    return this.db.vehicle.findMany({
      where: { schoolId },
      include: { driverAssignments: { where: { endedAt: null }, include: { staff: { include: { user: { select: { displayName: true } } } } } }, issues: { where: { status: "OPEN" }, orderBy: { createdAt: "desc" } } },
      orderBy: [{ status: "asc" }, { registrationNumber: "asc" }],
    });
  }

  async createVehicle(schoolId: string, actorUserId: string, input: CreateVehicleDto) {
    const registrationNumber = input.registrationNumber.replace(/\s+/g, "").toUpperCase();
    if (await this.db.vehicle.findUnique({ where: { schoolId_registrationNumber: { schoolId, registrationNumber } } })) throw new ConflictException("This vehicle registration already exists");
    return this.db.$transaction(async transaction => {
      const vehicle = await transaction.vehicle.create({ data: {
        schoolId, registrationNumber, make: input.make.trim(), model: input.model.trim(), transmission: input.transmission,
        odometerKm: input.odometerKm, insuranceExpiresAt: input.insuranceExpiresAt ? new Date(input.insuranceExpiresAt) : null,
        pucExpiresAt: input.pucExpiresAt ? new Date(input.pucExpiresAt) : null,
      } });
      await transaction.auditLog.create({ data: { schoolId, actorUserId, action: "vehicle.created", entityType: "Vehicle", entityId: vehicle.id } });
      return vehicle;
    });
  }

  async updateVehicleStatus(schoolId: string, actorUserId: string, vehicleId: string, input: UpdateVehicleStatusDto) {
    const vehicle = await this.db.vehicle.findFirst({ where: { id: vehicleId, schoolId } });
    if (!vehicle) throw new NotFoundException("Vehicle was not found");
    if (input.status !== "AVAILABLE" && await this.db.lesson.findFirst({ where: { vehicleId: vehicle.id, status: "ACTIVE" } })) throw new BadRequestException("End the active lesson before changing vehicle availability");
    return this.db.$transaction(async transaction => {
      const updated = await transaction.vehicle.update({ where: { id: vehicle.id }, data: { status: input.status } });
      if (input.status !== "AVAILABLE") await transaction.driverVehicleAssignment.updateMany({ where: { vehicleId: vehicle.id, endedAt: null }, data: { endedAt: new Date() } });
      await transaction.auditLog.create({ data: { schoolId, actorUserId, action: "vehicle.status_changed", entityType: "Vehicle", entityId: vehicle.id, metadata: { status: input.status } } });
      return updated;
    });
  }

  async assignVehicle(schoolId: string, actorUserId: string, staffId: string, input: AssignVehicleDto) {
    const [staff, vehicle] = await Promise.all([
      this.db.staffProfile.findFirst({ where: { id: staffId, schoolId }, include: { user: true, vehicleAssignments: { where: { endedAt: null } } } }),
      this.db.vehicle.findFirst({ where: { id: input.vehicleId, schoolId }, include: { driverAssignments: { where: { endedAt: null } } } }),
    ]);
    if (!staff || !vehicle) throw new NotFoundException("Staff member or vehicle was not found");
    if (await this.db.lesson.findFirst({ where: { staffId: staff.id, status: "ACTIVE" } })) throw new BadRequestException("End the active lesson before changing the assigned vehicle");
    if (staff.status !== "ACTIVE" || !staff.user.active || staff.licenceExpiresAt < this.today()) throw new BadRequestException("Driver is inactive or their licence has expired");
    if (vehicle.status !== "AVAILABLE") throw new BadRequestException("Only available vehicles can be assigned");
    if (vehicle.transmission === "MANUAL" && !staff.canDriveManual || vehicle.transmission === "AUTOMATIC" && !staff.canDriveAutomatic) throw new BadRequestException("Driver is not permitted for this transmission");
    const current = staff.vehicleAssignments[0];
    if (current?.vehicleId === vehicle.id) return current;
    if (vehicle.driverAssignments.length) throw new ConflictException("Vehicle is already assigned to another driver");
    try {
      return await this.db.$transaction(async transaction => {
        await transaction.driverVehicleAssignment.updateMany({ where: { staffId: staff.id, endedAt: null }, data: { endedAt: new Date() } });
        const assignment = await transaction.driverVehicleAssignment.create({ data: { staffId: staff.id, vehicleId: vehicle.id } });
        await transaction.auditLog.create({ data: { schoolId, actorUserId, action: "vehicle.assigned", entityType: "DriverVehicleAssignment", entityId: assignment.id, metadata: { staffId: staff.id, vehicleId: vehicle.id } } });
        return assignment;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("Driver or vehicle received another active assignment");
      throw error;
    }
  }

  async myVehicle(userId: string, schoolId: string) {
    const staff = await this.db.staffProfile.findFirst({ where: { userId, schoolId }, include: { vehicleAssignments: { where: { endedAt: null }, include: { vehicle: { include: { issues: { where: { status: "OPEN" }, orderBy: { createdAt: "desc" } } } } } } } });
    if (!staff) throw new NotFoundException("Staff profile was not found");
    return staff;
  }

  async reportIssue(schoolId: string, actorUserId: string, role: RoleKey, vehicleId: string, input: ReportVehicleIssueDto) {
    const vehicle = await this.db.vehicle.findFirst({ where: { id: vehicleId, schoolId } });
    if (!vehicle) throw new NotFoundException("Vehicle was not found");
    const reporter = role === "STAFF" ? await this.db.staffProfile.findFirst({ where: { userId: actorUserId, schoolId }, include: { vehicleAssignments: { where: { vehicleId, endedAt: null } } } }) : null;
    if (role === "STAFF" && !reporter?.vehicleAssignments.length) throw new ForbiddenException("Staff can report issues only for their assigned vehicle");
    return this.db.$transaction(async transaction => {
      const issue = await transaction.vehicleIssue.create({ data: { vehicleId, reportedByStaffId: reporter?.id, severity: input.severity, description: input.description.trim() } });
      await transaction.auditLog.create({ data: { schoolId, actorUserId, action: "vehicle.issue_reported", entityType: "VehicleIssue", entityId: issue.id, metadata: { vehicleId, severity: input.severity } } });
      return issue;
    });
  }

  private today() { const date = new Date(); date.setHours(0, 0, 0, 0); return date; }
}
