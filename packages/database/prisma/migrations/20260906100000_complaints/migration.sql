CREATE TYPE "ComplaintStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
CREATE TYPE "ComplaintPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "ComplaintMessageVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

CREATE TABLE "Complaint" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "enrollmentId" TEXT NOT NULL, "customerUserId" TEXT NOT NULL,
  "subject" TEXT NOT NULL, "description" TEXT NOT NULL, "status" "ComplaintStatus" NOT NULL DEFAULT 'SUBMITTED',
  "priority" "ComplaintPriority" NOT NULL DEFAULT 'NORMAL', "lessonId" TEXT, "staffId" TEXT, "vehicleId" TEXT,
  "paymentId" TEXT, "resolutionOutcome" TEXT, "resolvedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ComplaintMessage" (
  "id" TEXT NOT NULL, "complaintId" TEXT NOT NULL, "authorUserId" TEXT NOT NULL, "body" TEXT NOT NULL,
  "visibility" "ComplaintMessageVisibility" NOT NULL DEFAULT 'PUBLIC', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplaintMessage_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ComplaintAttachment" (
  "id" TEXT NOT NULL, "complaintId" TEXT NOT NULL, "url" TEXT NOT NULL, "publicId" TEXT NOT NULL, "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplaintAttachment_pkey" PRIMARY KEY ("id"), CONSTRAINT "ComplaintAttachment_size_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 5242880)
);
CREATE INDEX "Complaint_schoolId_status_createdAt_idx" ON "Complaint"("schoolId", "status", "createdAt");
CREATE INDEX "Complaint_customerUserId_createdAt_idx" ON "Complaint"("customerUserId", "createdAt");
CREATE INDEX "ComplaintMessage_complaintId_createdAt_idx" ON "ComplaintMessage"("complaintId", "createdAt");
CREATE INDEX "ComplaintAttachment_complaintId_idx" ON "ComplaintAttachment"("complaintId");
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintMessage" ADD CONSTRAINT "ComplaintMessage_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplaintMessage" ADD CONSTRAINT "ComplaintMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComplaintAttachment" ADD CONSTRAINT "ComplaintAttachment_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
