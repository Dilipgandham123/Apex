import { BadRequestException } from "@nestjs/common";
import type { AuthenticatedRequest } from "./auth.types";

export function requestSchoolId(request: AuthenticatedRequest, requestedSchool?: string) {
  const schoolId = request.auth.role === "SUPER_ADMIN" ? requestedSchool : request.auth.schoolId;
  if (!schoolId) throw new BadRequestException("A school must be selected");
  return schoolId;
}
