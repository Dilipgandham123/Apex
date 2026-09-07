CREATE TYPE "LessonStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'COMPLETED_WITH_SHORTFALL');

CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "classNumber" INTEGER NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'ACTIVE',
    "normalTargetKm" DECIMAL(6,2) NOT NULL,
    "pendingKmBefore" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "totalTargetKm" DECIMAL(6,2) NOT NULL,
    "startOdometerKm" DECIMAL(10,1) NOT NULL,
    "endOdometerKm" DECIMAL(10,1),
    "coveredKm" DECIMAL(6,2),
    "shortfallKm" DECIMAL(6,2),
    "startEvidenceUrl" TEXT,
    "endEvidenceUrl" TEXT,
    "customerSummary" TEXT,
    "privateNote" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonSkill" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LessonSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lesson_enrollmentId_classNumber_key" ON "Lesson"("enrollmentId", "classNumber");
CREATE INDEX "Lesson_schoolId_startedAt_idx" ON "Lesson"("schoolId", "startedAt");
CREATE INDEX "Lesson_customerId_status_idx" ON "Lesson"("customerId", "status");
CREATE INDEX "Lesson_staffId_status_idx" ON "Lesson"("staffId", "status");
CREATE INDEX "Lesson_vehicleId_status_idx" ON "Lesson"("vehicleId", "status");
CREATE UNIQUE INDEX "Lesson_one_active_per_customer" ON "Lesson"("customerId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "Lesson_one_active_per_driver" ON "Lesson"("staffId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "Lesson_one_active_per_vehicle" ON "Lesson"("vehicleId") WHERE "status" = 'ACTIVE';
CREATE UNIQUE INDEX "LessonSkill_lessonId_name_key" ON "LessonSkill"("lessonId", "name");

ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LessonSkill" ADD CONSTRAINT "LessonSkill_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
