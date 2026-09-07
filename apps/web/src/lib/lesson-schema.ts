import { z } from "zod";

export const startLessonSchema = z.object({
  enrollmentId: z.string().min(1),
  startOdometerKm: z.number().nonnegative().max(9999999),
  startEvidenceUrl: z.url().optional(),
});

export const endLessonSchema = z.object({
  endOdometerKm: z.number().nonnegative().max(9999999),
  endEvidenceUrl: z.url().optional(),
  customerSummary: z.string().trim().max(500).optional(),
  privateNote: z.string().trim().max(1000).optional(),
  skills: z.array(z.string()).max(12),
});
