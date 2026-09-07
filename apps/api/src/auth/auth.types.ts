import type { Request } from "express";

export const roleKeys = ["SUPER_ADMIN", "SCHOOL_ADMIN", "STAFF", "CUSTOMER"] as const;
export type RoleKey = (typeof roleKeys)[number];

export type AccessClaims = {
  sub: string;
  sid: string;
  membershipId: string;
  schoolId: string | null;
  role: RoleKey;
  type: "access";
};

export type AuthenticatedRequest = Request & { auth: AccessClaims };
