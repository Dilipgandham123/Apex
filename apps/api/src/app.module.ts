import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { AuthModule } from "./auth/auth.module";
import { RegistrationModule } from "./registration/registration.module";
import { FleetModule } from "./fleet/fleet.module";
import { LessonsModule } from "./lessons/lessons.module";
import { TrainingModule } from "./training/training.module";
import { CustomerModule } from "./customer/customer.module";
import { PaymentsModule } from "./payments/payments.module";
import { ComplaintsModule } from "./complaints/complaints.module";
import { ReportsModule } from "./reports/reports.module";
import { EnquiriesModule } from "./enquiries/enquiries.module";
import { NotificationsModule } from "./notifications/notifications.module";

@Module({ imports: [AuthModule, RegistrationModule, FleetModule, LessonsModule, TrainingModule, CustomerModule, PaymentsModule, ComplaintsModule, ReportsModule, EnquiriesModule, NotificationsModule], controllers: [HealthController] })
export class AppModule {}
