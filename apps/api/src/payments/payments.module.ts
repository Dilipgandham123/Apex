import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PaymentsController, RazorpayWebhookController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({ imports: [AuthModule], controllers: [PaymentsController, RazorpayWebhookController], providers: [PaymentsService] })
export class PaymentsModule {}
