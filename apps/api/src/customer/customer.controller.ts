import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { Roles } from "../auth/auth.decorators";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../auth/auth.guards";
import { requestSchoolId } from "../auth/school";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { CustomerService } from "./customer.service";

@Controller("customer/me")
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles("CUSTOMER")
export class CustomerController {
  constructor(private readonly customer: CustomerService) {}
  @Get("overview") overview(@Req() request: AuthenticatedRequest) { return this.customer.overview(request.auth.sub, requestSchoolId(request)); }
}
