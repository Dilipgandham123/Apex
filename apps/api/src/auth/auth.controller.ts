import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { PasswordLoginDto, RequestOtpDto, VerifyOtpDto } from "./auth.dto";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "./auth.guards";
import type { AuthenticatedRequest } from "./auth.types";

const refreshCookie = "driving_school_refresh";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("password/login")
  @HttpCode(200)
  async passwordLogin(@Body() body: PasswordLoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.withCookie(response, await this.auth.passwordLogin(body.identifier, body.password, body.schoolId, this.meta(request)));
  }

  @Post("customer/request-otp")
  @HttpCode(200)
  requestOtp(@Body() body: RequestOtpDto, @Req() request: Request) {
    return this.auth.requestOtp(body.phone, this.meta(request));
  }

  @Post("customer/verify-otp")
  @HttpCode(200)
  async verifyOtp(@Body() body: VerifyOtpDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.withCookie(response, await this.auth.verifyOtp(body.challengeId, body.code, this.meta(request)));
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Headers("cookie") cookie: string | undefined, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.withCookie(response, await this.auth.refresh(this.cookie(cookie), this.meta(request)));
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Headers("cookie") cookie: string | undefined, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(this.cookie(cookie), undefined, this.meta(request));
    response.clearCookie(refreshCookie, cookieOptions);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard, TenantGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me(request.auth.sub, request.auth.membershipId);
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard, TenantGuard)
  sessions(@Req() request: AuthenticatedRequest) {
    return this.auth.sessions(request.auth.sub);
  }

  @Delete("sessions/:sessionId")
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
  revokeSession(@Param("sessionId") sessionId: string, @Req() request: AuthenticatedRequest) {
    return this.auth.revokeSession(request.auth.sub, sessionId, this.meta(request));
  }

  private withCookie(response: Response, result: { refreshToken: string; [key: string]: unknown }) {
    const { refreshToken, ...body } = result;
    response.cookie(refreshCookie, refreshToken, cookieOptions);
    return body;
  }

  private cookie(header: string | undefined) {
    return header?.split(";").map(part => part.trim()).find(part => part.startsWith(`${refreshCookie}=`))?.slice(refreshCookie.length + 1);
  }

  private meta(request: Request) {
    return { ipAddress: request.ip, userAgent: request.headers["user-agent"] };
  }
}
