import { SetMetadata } from "@nestjs/common";
import type { RoleKey } from "./auth.types";

export const ROLES_KEY = "allowedRoles";
export const Roles = (...roles: RoleKey[]) => SetMetadata(ROLES_KEY, roles);
