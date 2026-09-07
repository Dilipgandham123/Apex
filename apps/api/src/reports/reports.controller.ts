import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/auth.decorators";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../auth/auth.guards";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { requestSchoolId } from "../auth/school";
import { ReportsService } from "./reports.service";

@Controller("reports")
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get("dashboard") @Roles("SUPER_ADMIN", "SCHOOL_ADMIN") dashboard(@Req() request: AuthenticatedRequest) { return this.reports.adminDashboard(requestSchoolId(request)); }
  @Get() @Roles("SUPER_ADMIN", "SCHOOL_ADMIN") report(@Req() request: AuthenticatedRequest) { return this.reports.report(requestSchoolId(request)); }
  @Get("staff/me") @Roles("STAFF") staff(@Req() request: AuthenticatedRequest) { return this.reports.staffDashboard(request.auth.sub, requestSchoolId(request)); }
}
