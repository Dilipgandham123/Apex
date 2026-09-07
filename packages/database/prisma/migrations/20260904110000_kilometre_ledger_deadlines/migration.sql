CREATE TYPE "KilometreEntryType" AS ENUM ('SHORTFALL', 'RECOVERY', 'ADJUSTMENT');

CREATE TABLE "KilometreLedgerEntry" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "type" "KilometreEntryType" NOT NULL,
  "amountKm" DECIMAL(6,2) NOT NULL,
  "shortfallLessonId" TEXT,
  "recoveryLessonId" TEXT,
  "adjustmentKm" DECIMAL(6,2),
  "reason" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KilometreLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeadlineExtension" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "previousDeadline" TIMESTAMP(3) NOT NULL,
  "newDeadline" TIMESTAMP(3) NOT NULL,
  "reason" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeadlineExtension_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KilometreLedgerEntry_enrollmentId_createdAt_idx" ON "KilometreLedgerEntry"("enrollmentId", "createdAt");
CREATE INDEX "KilometreLedgerEntry_shortfallLessonId_type_idx" ON "KilometreLedgerEntry"("shortfallLessonId", "type");
CREATE INDEX "KilometreLedgerEntry_recoveryLessonId_idx" ON "KilometreLedgerEntry"("recoveryLessonId");
CREATE INDEX "DeadlineExtension_enrollmentId_createdAt_idx" ON "DeadlineExtension"("enrollmentId", "createdAt");

ALTER TABLE "KilometreLedgerEntry" ADD CONSTRAINT "KilometreLedgerEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KilometreLedgerEntry" ADD CONSTRAINT "KilometreLedgerEntry_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KilometreLedgerEntry" ADD CONSTRAINT "KilometreLedgerEntry_shortfallLessonId_fkey" FOREIGN KEY ("shortfallLessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KilometreLedgerEntry" ADD CONSTRAINT "KilometreLedgerEntry_recoveryLessonId_fkey" FOREIGN KEY ("recoveryLessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KilometreLedgerEntry" ADD CONSTRAINT "KilometreLedgerEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeadlineExtension" ADD CONSTRAINT "DeadlineExtension_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeadlineExtension" ADD CONSTRAINT "DeadlineExtension_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeadlineExtension" ADD CONSTRAINT "DeadlineExtension_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "KilometreLedgerEntry" ADD CONSTRAINT "KilometreLedgerEntry_shape_check" CHECK (
  ("type" = 'SHORTFALL' AND "shortfallLessonId" IS NOT NULL AND "recoveryLessonId" IS NULL AND "adjustmentKm" IS NULL) OR
  ("type" = 'RECOVERY' AND "shortfallLessonId" IS NOT NULL AND "recoveryLessonId" IS NOT NULL AND "adjustmentKm" IS NULL) OR
  ("type" = 'ADJUSTMENT' AND "adjustmentKm" IS NOT NULL AND "reason" IS NOT NULL AND "createdByUserId" IS NOT NULL)
);
ALTER TABLE "KilometreLedgerEntry" ADD CONSTRAINT "KilometreLedgerEntry_amount_positive" CHECK ("amountKm" > 0);
ALTER TABLE "DeadlineExtension" ADD CONSTRAINT "DeadlineExtension_forward_only" CHECK ("newDeadline" > "previousDeadline");
