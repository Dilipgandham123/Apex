import { z } from "zod";

export const courseInputSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9-]{2,20}$/),
  name: z.string().trim().min(2).max(80),
  transmission: z.enum(["MANUAL", "AUTOMATIC"]),
  price: z.number().nonnegative(),
  classCount: z.number().int().min(1).max(200),
  targetKmPerClass: z.number().positive().max(100),
  durationDays: z.number().int().min(1).max(365),
});

export const customerEnrollmentInputSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  email: z.email().optional(),
  dateOfBirth: z.iso.date().optional(),
  address: z.string().trim().max(500).optional(),
  courseId: z.string().min(1),
  discountAmount: z.number().nonnegative(),
  initialPaid: z.number().nonnegative(),
});
