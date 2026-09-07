import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CoursesController } from "./courses.controller";
import { CustomersController } from "./customers.controller";
import { RegistrationService } from "./registration.service";

@Module({ imports: [AuthModule], controllers: [CoursesController, CustomersController], providers: [RegistrationService] })
export class RegistrationModule {}
