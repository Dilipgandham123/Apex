import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DatabaseService } from "../database.service";
import { jwtSecret } from "./auth.config";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "./auth.guards";
import { AuthService } from "./auth.service";

@Module({
  imports: [JwtModule.register({ secret: jwtSecret() })],
  controllers: [AuthController],
  providers: [DatabaseService, AuthService, JwtAuthGuard, RolesGuard, TenantGuard],
  exports: [JwtModule, DatabaseService, JwtAuthGuard, RolesGuard, TenantGuard],
})
export class AuthModule {}
