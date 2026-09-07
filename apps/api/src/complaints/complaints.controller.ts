import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/auth.decorators";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../auth/auth.guards";
import { requestSchoolId } from "../auth/school";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { ComplaintReplyDto, CreateComplaintDto, UpdateComplaintDto } from "./complaints.dto";
import { ComplaintsService } from "./complaints.service";

@Controller("complaints")
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ComplaintsController {
  constructor(private readonly complaints: ComplaintsService) {}
  @Get() @Roles("SUPER_ADMIN", "SCHOOL_ADMIN") adminList(@Req() request: AuthenticatedRequest) { return this.complaints.adminList(requestSchoolId(request)); }
  @Get("customer/me") @Roles("CUSTOMER") customerList(@Req() request: AuthenticatedRequest) { return this.complaints.customerList(request.auth.sub, requestSchoolId(request)); }
  @Get("customer/context") @Roles("CUSTOMER") context(@Req() request: AuthenticatedRequest) { return this.complaints.context(request.auth.sub, requestSchoolId(request)); }
  @Get("attachments/signature") @Roles("CUSTOMER") signature() { return this.complaints.attachmentSignature(); }
  @Post() @Roles("CUSTOMER") create(@Req() request: AuthenticatedRequest, @Body() input: CreateComplaintDto) { return this.complaints.create(request.auth.sub, requestSchoolId(request), input); }
  @Post(":id/replies") @Roles("SUPER_ADMIN", "SCHOOL_ADMIN") adminReply(@Req() request: AuthenticatedRequest, @Param("id") id: string, @Body() input: ComplaintReplyDto) { return this.complaints.adminReply(requestSchoolId(request), request.auth.sub, id, input); }
  @Post(":id/customer-replies") @Roles("CUSTOMER") customerReply(@Req() request: AuthenticatedRequest, @Param("id") id: string, @Body() input: ComplaintReplyDto) { return this.complaints.customerReply(request.auth.sub, requestSchoolId(request), id, input); }
  @Patch(":id") @Roles("SUPER_ADMIN", "SCHOOL_ADMIN") update(@Req() request: AuthenticatedRequest, @Param("id") id: string, @Body() input: UpdateComplaintDto) { return this.complaints.update(requestSchoolId(request), request.auth.sub, id, input); }
}
