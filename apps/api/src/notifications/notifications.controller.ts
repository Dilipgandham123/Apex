import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/auth.decorators";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../auth/auth.guards";
import { requestSchoolId } from "../auth/school";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}
  @Get() list(@Req() request: AuthenticatedRequest) { return this.notifications.list(requestSchoolId(request)); }
  @Post("process") process() { return this.notifications.processDue(); }
  @Post("sweep") sweep() { return this.notifications.sweepScheduled(); }
  @Post(":id/retry") retry(@Req() request: AuthenticatedRequest, @Param("id") id: string) { return this.notifications.retry(requestSchoolId(request), id); }
}
