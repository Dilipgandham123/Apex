CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'ENROLLED', 'CLOSED');

CREATE TABLE "PublicEnquiry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "preferredSlot" TEXT NOT NULL,
    "notes" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'WEBSITE_WHATSAPP',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicEnquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicEnquiry_schoolId_status_createdAt_idx" ON "PublicEnquiry"("schoolId", "status", "createdAt");
CREATE INDEX "PublicEnquiry_schoolId_phone_createdAt_idx" ON "PublicEnquiry"("schoolId", "phone", "createdAt");
ALTER TABLE "PublicEnquiry" ADD CONSTRAINT "PublicEnquiry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
