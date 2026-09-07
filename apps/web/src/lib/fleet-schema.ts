import { z } from "zod";

export const staffInputSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: z.email(),
  password: z.string().min(12),
  licenceNumber: z.string().trim().min(3).max(40),
  licenceExpiresAt: z.iso.date(),
  canDriveManual: z.boolean(),
  canDriveAutomatic: z.boolean(),
}).refine(value => value.canDriveManual || value.canDriveAutomatic, { message: "Select at least one transmission permission" });

export const vehicleInputSchema = z.object({
  registrationNumber: z.string().regex(/^[A-Za-z0-9 -]{5,20}$/),
  make: z.string().trim().min(2).max(50),
  model: z.string().trim().min(1).max(50),
  transmission: z.enum(["MANUAL", "AUTOMATIC"]),
  odometerKm: z.number().nonnegative().max(9999999),
  insuranceExpiresAt: z.iso.date().optional(),
  pucExpiresAt: z.iso.date().optional(),
});

export const vehicleIssueInputSchema = z.object({
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  description: z.string().trim().min(5).max(500),
});
