import { Body, Controller, Get, Headers, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/auth.decorators";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../auth/auth.guards";
import { requestSchoolId } from "../auth/school";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { AssignVehicleDto, CreateStaffDto, UpdateStaffStatusDto } from "./fleet.dto";
import { FleetService } from "./fleet.service";

@Controller("staff")
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class StaffController {
  constructor(private readonly fleet: FleetService) {}

  @Get() @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  list(@Req() request: AuthenticatedRequest, @Headers("x-school-id") requestedSchool?: string) { return this.fleet.staff(requestSchoolId(request, requestedSchool)); }

  @Post() @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  create(@Req() request: AuthenticatedRequest, @Headers("x-school-id") requestedSchool: string | undefined, @Body() input: CreateStaffDto) { return this.fleet.createStaff(requestSchoolId(request, requestedSchool), request.auth.sub, input); }

  @Patch(":staffId/status") @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  status(@Req() request: AuthenticatedRequest, @Headers("x-school-id") requestedSchool: string | undefined, @Param("staffId") staffId: string, @Body() input: UpdateStaffStatusDto) { return this.fleet.updateStaffStatus(requestSchoolId(request, requestedSchool), request.auth.sub, staffId, input); }

  @Post(":staffId/vehicle-assignment") @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  assign(@Req() request: AuthenticatedRequest, @Headers("x-school-id") requestedSchool: string | undefined, @Param("staffId") staffId: string, @Body() input: AssignVehicleDto) { return this.fleet.assignVehicle(requestSchoolId(request, requestedSchool), request.auth.sub, staffId, input); }

  @Get("me") @Roles("STAFF")
  me(@Req() request: AuthenticatedRequest) { return this.fleet.myVehicle(request.auth.sub, requestSchoolId(request)); }
}
