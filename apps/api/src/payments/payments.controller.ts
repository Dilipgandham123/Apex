import { Body, Controller, Get, Headers, Param, Post, Req, RawBodyRequest, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { Roles } from "../auth/auth.decorators";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../auth/auth.guards";
import { requestSchoolId } from "../auth/school";
import type { AuthenticatedRequest } from "../auth/auth.types";
import { CreateOrderDto, ManualPaymentDto, RefundPaymentDto, VerifyPaymentDto } from "./payments.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Get() @Roles("SUPER_ADMIN", "SCHOOL_ADMIN") adminList(@Req() request: AuthenticatedRequest) { return this.payments.adminList(requestSchoolId(request)); }
  @Post("manual") @Roles("SUPER_ADMIN", "SCHOOL_ADMIN") manual(@Req() request: AuthenticatedRequest, @Body() input: ManualPaymentDto) { return this.payments.manual(requestSchoolId(request), request.auth.sub, input); }
  @Post(":paymentId/refunds") @Roles("SUPER_ADMIN", "SCHOOL_ADMIN") refund(@Req() request: AuthenticatedRequest, @Param("paymentId") id: string, @Body() input: RefundPaymentDto) { return this.payments.refund(requestSchoolId(request), request.auth.sub, id, input); }
  @Get("customer/me") @Roles("CUSTOMER") customer(@Req() request: AuthenticatedRequest) { return this.payments.customerPayments(request.auth.sub, requestSchoolId(request)); }
  @Post("razorpay/orders") @Roles("CUSTOMER") order(@Req() request: AuthenticatedRequest, @Body() input: CreateOrderDto) { return this.payments.createOrder(request.auth.sub, requestSchoolId(request), input); }
  @Post("razorpay/verify") @Roles("CUSTOMER") verify(@Req() request: AuthenticatedRequest, @Body() input: VerifyPaymentDto) { return this.payments.verify(request.auth.sub, requestSchoolId(request), input); }
}

@Controller("payments/razorpay")
export class RazorpayWebhookController {
  constructor(private readonly payments: PaymentsService) {}
  @Post("webhook") webhook(@Req() request: RawBodyRequest<Request>, @Headers("x-razorpay-signature") signature?: string, @Headers("x-razorpay-event-id") eventId?: string) { return this.payments.webhook(request.rawBody ?? Buffer.alloc(0), signature, eventId); }
}
