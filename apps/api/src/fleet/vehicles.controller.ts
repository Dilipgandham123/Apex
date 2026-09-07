import { Body, Controller, Get, Headers, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/auth.decorators";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../auth/auth.guards";
import { requestSchoolId } from "../auth/school";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { CreateVehicleDto, ReportVehicleIssueDto, UpdateVehicleStatusDto } from "./fleet.dto";
import { FleetService } from "./fleet.service";

@Controller("vehicles")
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class VehiclesController {
  constructor(private readonly fleet: FleetService) {}

  @Get() @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  list(@Req() request: AuthenticatedRequest, @Headers("x-school-id") requestedSchool?: string) { return this.fleet.vehicles(requestSchoolId(request, requestedSchool)); }

  @Post() @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  create(@Req() request: AuthenticatedRequest, @Headers("x-school-id") requestedSchool: string | undefined, @Body() input: CreateVehicleDto) { return this.fleet.createVehicle(requestSchoolId(request, requestedSchool), request.auth.sub, input); }

  @Patch(":vehicleId/status") @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  status(@Req() request: AuthenticatedRequest, @Headers("x-school-id") requestedSchool: string | undefined, @Param("vehicleId") vehicleId: string, @Body() input: UpdateVehicleStatusDto) { return this.fleet.updateVehicleStatus(requestSchoolId(request, requestedSchool), request.auth.sub, vehicleId, input); }

  @Post(":vehicleId/issues") @Roles("SUPER_ADMIN", "SCHOOL_ADMIN", "STAFF")
  issue(@Req() request: AuthenticatedRequest, @Headers("x-school-id") requestedSchool: string | undefined, @Param("vehicleId") vehicleId: string, @Body() input: ReportVehicleIssueDto) { return this.fleet.reportIssue(requestSchoolId(request, requestedSchool), request.auth.sub, request.auth.role, vehicleId, input); }
}
