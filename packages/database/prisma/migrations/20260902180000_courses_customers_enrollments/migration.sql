CREATE TYPE "TransmissionType" AS ENUM ('MANUAL', 'AUTOMATIC');
CREATE TYPE "CustomerStatus" AS ENUM ('REGISTERED', 'INACTIVE');
CREATE TYPE "EnrollmentStatus" AS ENUM ('NOT_STARTED', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transmission" "TransmissionType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "classCount" INTEGER NOT NULL DEFAULT 28,
    "targetKmPerClass" DECIMAL(6,2) NOT NULL DEFAULT 6,
    "durationDays" INTEGER NOT NULL DEFAULT 60,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "customerCode" TEXT NOT NULL,
    "status" "CustomerStatus" NOT NULL DEFAULT 'REGISTERED',
    "dateOfBirth" DATE,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "courseNameSnapshot" TEXT NOT NULL,
    "priceSnapshot" DECIMAL(10,2) NOT NULL,
    "classCountSnapshot" INTEGER NOT NULL,
    "targetKmPerClassSnapshot" DECIMAL(6,2) NOT NULL,
    "durationDaysSnapshot" INTEGER NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalPayable" DECIMAL(10,2) NOT NULL,
    "initialPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "firstLessonAt" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Course_schoolId_code_key" ON "Course"("schoolId", "code");
CREATE INDEX "Course_schoolId_active_idx" ON "Course"("schoolId", "active");
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");
CREATE UNIQUE INDEX "CustomerProfile_schoolId_customerCode_key" ON "CustomerProfile"("schoolId", "customerCode");
CREATE INDEX "CustomerProfile_schoolId_status_idx" ON "CustomerProfile"("schoolId", "status");
CREATE INDEX "CourseEnrollment_customerId_status_idx" ON "CourseEnrollment"("customerId", "status");
CREATE INDEX "CourseEnrollment_courseId_idx" ON "CourseEnrollment"("courseId");

ALTER TABLE "Course" ADD CONSTRAINT "Course_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
