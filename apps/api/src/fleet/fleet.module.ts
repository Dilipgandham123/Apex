import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { FleetService } from "./fleet.service";
import { StaffController } from "./staff.controller";
import { VehiclesController } from "./vehicles.controller";

@Module({ imports: [AuthModule], controllers: [StaffController, VehiclesController], providers: [FleetService] })
export class FleetModule {}
