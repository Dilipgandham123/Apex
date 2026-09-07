import { Body, Controller, Get, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/auth.decorators";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../auth/auth.guards";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { requestSchoolId } from "../auth/school";
import { CreateCourseDto } from "./registration.dto";
import { RegistrationService } from "./registration.service";

@Controller("courses")
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
export class CoursesController {
  constructor(private readonly registration: RegistrationService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest, @Headers("x-school-id") requestedSchool?: string) {
    return this.registration.courses(requestSchoolId(request, requestedSchool));
  }

  @Post()
  create(@Req() request: AuthenticatedRequest, @Headers("x-school-id") requestedSchool: string | undefined, @Body() input: CreateCourseDto) {
    return this.registration.createCourse(requestSchoolId(request, requestedSchool), request.auth.sub, input);
  }
}
