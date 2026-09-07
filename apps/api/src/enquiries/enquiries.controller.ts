import { Body, Controller, Get, Headers, Ip, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/auth.decorators";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../auth/auth.guards";
import { requestSchoolId } from "../auth/school";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { CreateEnquiryDto, UpdateEnquiryDto } from "./enquiries.dto";
import { EnquiriesService } from "./enquiries.service";

@Controller("enquiries")
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @Post()
  create(@Body() input: CreateEnquiryDto, @Ip() ipAddress: string, @Headers("user-agent") userAgent?: string) {
    return this.enquiries.create(input, ipAddress, userAgent);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  list(@Req() request: AuthenticatedRequest) { return this.enquiries.list(requestSchoolId(request)); }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  @Roles("SUPER_ADMIN", "SCHOOL_ADMIN")
  update(@Req() request: AuthenticatedRequest, @Param("id") id: string, @Body() input: UpdateEnquiryDto) {
    return this.enquiries.update(requestSchoolId(request), request.auth.sub, id, input);
  }
}
