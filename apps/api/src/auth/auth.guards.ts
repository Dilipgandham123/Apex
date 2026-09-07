import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { DatabaseService } from "../database.service";
import { ROLES_KEY } from "./auth.decorators";
import type { AccessClaims, AuthenticatedRequest, RoleKey } from "./auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) throw new UnauthorizedException("Authentication required");
    let claims: AccessClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessClaims>(token);
    } catch {
      throw new UnauthorizedException("Access token is invalid or expired");
    }
    if (claims.type !== "access") throw new UnauthorizedException("Invalid token type");
    const membership = await this.db.schoolMembership.findUnique({
      where: { id: claims.membershipId },
      include: { user: true, role: true, refreshTokens: { where: { id: claims.sid }, select: { revokedAt: true, expiresAt: true } } },
    });
    const session = membership?.refreshTokens[0];
    if (!membership?.active || !membership.user.active || membership.userId !== claims.sub || membership.role.key !== claims.role || !session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException("Account access is no longer active");
    }
    request.auth = claims;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<RoleKey[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!roles.includes(request.auth.role)) throw new ForbiddenException("Your role cannot perform this action");
    return true;
  }
}

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const requestedSchool = (request as Request).headers["x-school-id"];
    if (request.auth.role !== "SUPER_ADMIN" && requestedSchool && requestedSchool !== request.auth.schoolId) {
      throw new ForbiddenException("Cross-school access is not allowed");
    }
    return true;
  }
}
