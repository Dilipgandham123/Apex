import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/auth.decorators";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../auth/auth.guards";
import { requestSchoolId } from "../auth/school";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { AdjustKilometresDto, ExtendDeadlineDto } from "./training.dto";
import { TrainingService } from "./training.service";

@Controller("training")
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
export class TrainingController {
  constructor(private readonly training: TrainingService) {}
  @Get("enrollments") list(@Req() request: AuthenticatedRequest) { return this.training.enrollments(requestSchoolId(request)); }
  @Post("enrollments/:enrollmentId/deadline-extensions") extend(@Req() request: AuthenticatedRequest, @Param("enrollmentId") id: string, @Body() input: ExtendDeadlineDto) { return this.training.extend(requestSchoolId(request), request.auth.sub, id, input); }
  @Post("enrollments/:enrollmentId/kilometre-adjustments") adjust(@Req() request: AuthenticatedRequest, @Param("enrollmentId") id: string, @Body() input: AdjustKilometresDto) { return this.training.adjust(requestSchoolId(request), request.auth.sub, id, input); }
}
