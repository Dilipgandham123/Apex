import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { DatabaseService } from "../database.service";
import { otpSecret } from "./auth.config";
import type { AccessClaims, RoleKey } from "./auth.types";
import { verifyPassword } from "./password";
import { queueNotifications } from "../notifications/notification-outbox";

const accessSeconds = 15 * 60;
const refreshMilliseconds = 30 * 24 * 60 * 60 * 1000;
const otpMilliseconds = 5 * 60 * 1000;

type RequestMeta = { ipAddress?: string; userAgent?: string };

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService, private readonly jwt: JwtService) {}

  async passwordLogin(identifier: string, password: string, schoolId: string | undefined, meta: RequestMeta) {
    const normalized = identifier.trim().toLowerCase();
    const user = await this.db.user.findFirst({
      where: { OR: [{ email: normalized }, { id: identifier.trim() }] },
      include: { memberships: { where: { active: true }, include: { role: true } } },
    });
    if (!user?.active || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      if (user) await this.audit(user.id, null, "auth.password.failed", "User", user.id, meta);
      throw new UnauthorizedException("Email, staff ID, or password is incorrect");
    }
    const eligible = user.memberships.filter(membership => membership.role.key !== "CUSTOMER");
    const membership = schoolId
      ? eligible.find(item => item.schoolId === schoolId)
      : eligible.length === 1 ? eligible[0] : eligible.find(item => item.role.key === "SUPER_ADMIN");
    if (!membership) throw new BadRequestException(eligible.length > 1 ? "Select a school to continue" : "No active staff membership was found");
    const session = await this.createSession(user.id, membership.id, membership.schoolId, membership.role.key as RoleKey);
    await this.audit(user.id, membership.schoolId, "auth.password.succeeded", "RefreshToken", session.sessionId, meta);
    return { ...session, user: this.userSummary(user, membership.role.key as RoleKey, membership.schoolId) };
  }

  async requestOtp(phone: string, meta: RequestMeta) {
    const user = await this.db.user.findUnique({
      where: { phone },
      include: { memberships: { where: { active: true }, include: { role: true } } },
    });
    const customerMembership = user?.active ? user.memberships.find(item => item.role.key === "CUSTOMER") : undefined;

    const since = new Date(Date.now() - 10 * 60 * 1000);
    const recent = await this.db.otpChallenge.count({ where: { phone, createdAt: { gte: since } } });
    if (recent >= 5) throw new HttpException("Too many codes requested. Try again later.", HttpStatus.TOO_MANY_REQUESTS);

    const code = randomInt(100000, 1000000).toString();
    const challenge = await this.db.otpChallenge.create({
      data: { userId: customerMembership ? user?.id : null, phone, codeHash: this.otpHash(phone, code), expiresAt: new Date(Date.now() + otpMilliseconds) },
    });
    if (customerMembership && user) {
      await this.audit(user.id, customerMembership.schoolId, "auth.otp.requested", "OtpChallenge", challenge.id, meta);
      await queueNotifications(this.db, { schoolId: customerMembership.schoolId, userId: user.id, eventType: "OTP", eventId: challenge.id, phone, channels: ["WHATSAPP"], payload: { subject: "Your driving school login code", text: `Your Sri Sai Anu login code is ${code}. It expires in 5 minutes.`, values: [code], otp: true } });
    }
    return {
      challengeId: challenge.id,
      expiresInSeconds: otpMilliseconds / 1000,
      ...(customerMembership && process.env.NODE_ENV !== "production" && process.env.OTP_EXPOSE_IN_RESPONSE === "true" ? { developmentCode: code } : {}),
    };
  }

  async verifyOtp(challengeId: string, code: string, meta: RequestMeta) {
    const challenge = await this.db.otpChallenge.findUnique({
      where: { id: challengeId },
      include: { user: { include: { memberships: { where: { active: true }, include: { role: true } } } } },
    });
    const challengeUser = challenge?.user;
    const membership = challengeUser?.memberships.find(item => item.role.key === "CUSTOMER");
    if (!challenge || !challengeUser || !membership || challenge.consumedAt || challenge.expiresAt <= new Date() || challenge.attempts >= challenge.maxAttempts) {
      throw new UnauthorizedException("The verification code is invalid or expired");
    }
    if (!this.hashesMatch(challenge.codeHash, this.otpHash(challenge.phone, code))) {
      await this.db.otpChallenge.update({ where: { id: challenge.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException("The verification code is invalid or expired");
    }
    await this.db.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    const session = await this.createSession(challengeUser.id, membership.id, membership.schoolId, "CUSTOMER");
    await this.audit(challengeUser.id, membership.schoolId, "auth.otp.verified", "RefreshToken", session.sessionId, meta);
    return { ...session, user: this.userSummary(challengeUser, "CUSTOMER", membership.schoolId) };
  }

  async refresh(rawToken: string | undefined, meta: RequestMeta) {
    if (!rawToken) throw new UnauthorizedException("Refresh token is missing");
    const current = await this.db.refreshToken.findUnique({
      where: { tokenHash: this.tokenHash(rawToken) },
      include: { user: true, membership: { include: { role: true } } },
    });
    if (!current) throw new UnauthorizedException("Refresh token is invalid");
    if (current.revokedAt) {
      const now = new Date();
      await this.db.refreshToken.updateMany({
        where: { familyId: current.familyId },
        data: { revokedAt: now, reuseDetectedAt: now },
      });
      await this.audit(current.userId, current.membership.schoolId, "auth.refresh.reuse_detected", "RefreshToken", current.id, meta);
      throw new UnauthorizedException("Refresh token reuse was detected; all related sessions were revoked");
    }
    if (current.expiresAt <= new Date() || !current.user.active || !current.membership.active) {
      throw new UnauthorizedException("Refresh token is expired or inactive");
    }
    const nextRaw = randomBytes(48).toString("base64url");
    const next = await this.db.$transaction(async transaction => {
      const created = await transaction.refreshToken.create({
        data: {
          userId: current.userId,
          membershipId: current.membershipId,
          familyId: current.familyId,
          tokenHash: this.tokenHash(nextRaw),
          expiresAt: new Date(Date.now() + refreshMilliseconds),
        },
      });
      const revoked = await transaction.refreshToken.updateMany({
        where: { id: current.id, revokedAt: null },
        data: { revokedAt: new Date(), replacedById: created.id },
      });
      if (revoked.count !== 1) throw new UnauthorizedException("Refresh token has already been used");
      return created;
    });
    const claims = this.claims(current.userId, next.id, current.membershipId, current.membership.schoolId, current.membership.role.key as RoleKey);
    return {
      accessToken: await this.jwt.signAsync(claims, { expiresIn: accessSeconds }),
      refreshToken: nextRaw,
      sessionId: next.id,
      expiresInSeconds: accessSeconds,
      user: this.userSummary(current.user, claims.role, claims.schoolId),
    };
  }

  async logout(rawToken: string | undefined, actorId: string | undefined, meta: RequestMeta) {
    if (!rawToken) return;
    const token = await this.db.refreshToken.findUnique({ where: { tokenHash: this.tokenHash(rawToken) }, include: { membership: true } });
    if (!token || (actorId && token.userId !== actorId)) return;
    await this.db.refreshToken.update({ where: { id: token.id }, data: { revokedAt: token.revokedAt ?? new Date() } });
    await this.audit(token.userId, token.membership.schoolId, "auth.logout", "RefreshToken", token.id, meta);
  }

  async sessions(userId: string) {
    const sessions = await this.db.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    return sessions.map(item => ({ id: item.id, createdAt: item.createdAt, expiresAt: item.expiresAt }));
  }

  async revokeSession(userId: string, sessionId: string, meta: RequestMeta) {
    const token = await this.db.refreshToken.findFirst({ where: { id: sessionId, userId }, include: { membership: true } });
    if (!token) throw new BadRequestException("Session was not found");
    await this.db.refreshToken.update({ where: { id: token.id }, data: { revokedAt: token.revokedAt ?? new Date() } });
    await this.audit(userId, token.membership.schoolId, "auth.session.revoked", "RefreshToken", token.id, meta);
  }

  async me(userId: string, membershipId: string) {
    const membership = await this.db.schoolMembership.findFirst({
      where: { id: membershipId, userId, active: true },
      include: { user: true, role: { include: { permissions: { include: { permission: true } } } }, school: true },
    });
    if (!membership) throw new UnauthorizedException("Membership is no longer active");
    return {
      ...this.userSummary(membership.user, membership.role.key as RoleKey, membership.schoolId),
      school: membership.school ? { id: membership.school.id, name: membership.school.name } : null,
      permissions: membership.role.permissions.map(item => item.permission.key),
    };
  }

  private async createSession(userId: string, membershipId: string, schoolId: string | null, role: RoleKey) {
    const refreshToken = randomBytes(48).toString("base64url");
    const record = await this.db.refreshToken.create({
      data: {
        userId,
        membershipId,
        familyId: randomUUID(),
        tokenHash: this.tokenHash(refreshToken),
        expiresAt: new Date(Date.now() + refreshMilliseconds),
      },
    });
    return {
      accessToken: await this.jwt.signAsync(this.claims(userId, record.id, membershipId, schoolId, role), { expiresIn: accessSeconds }),
      refreshToken,
      sessionId: record.id,
      expiresInSeconds: accessSeconds,
    };
  }

  private claims(sub: string, sid: string, membershipId: string, schoolId: string | null, role: RoleKey): AccessClaims {
    return { sub, sid, membershipId, schoolId, role, type: "access" };
  }

  private tokenHash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private otpHash(phone: string, code: string) {
    return createHmac("sha256", otpSecret()).update(`${phone}:${code}`).digest("hex");
  }

  private hashesMatch(left: string, right: string) {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private userSummary(user: { id: string; displayName: string; email: string | null; phone: string | null }, role: RoleKey, schoolId: string | null) {
    return { id: user.id, displayName: user.displayName, email: user.email, phone: user.phone, role, schoolId };
  }

  private async audit(actorUserId: string | null, schoolId: string | null, action: string, entityType: string, entityId: string | null, meta: RequestMeta) {
    await this.db.auditLog.create({ data: { actorUserId, schoolId, action, entityType, entityId, ...meta } });
  }
}
