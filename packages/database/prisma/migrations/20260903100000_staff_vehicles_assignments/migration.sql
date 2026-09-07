CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'INACTIVE');
CREATE TYPE "VehicleIssueStatus" AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE "VehicleIssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "staffCode" TEXT NOT NULL,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "licenceNumber" TEXT NOT NULL,
    "licenceExpiresAt" DATE NOT NULL,
    "canDriveManual" BOOLEAN NOT NULL DEFAULT true,
    "canDriveAutomatic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "transmission" "TransmissionType" NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "odometerKm" DECIMAL(10,1) NOT NULL DEFAULT 0,
    "insuranceExpiresAt" DATE,
    "pucExpiresAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriverVehicleAssignment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "DriverVehicleAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VehicleIssue" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "reportedByStaffId" TEXT,
    "severity" "VehicleIssueSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "VehicleIssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VehicleIssue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");
CREATE UNIQUE INDEX "StaffProfile_schoolId_staffCode_key" ON "StaffProfile"("schoolId", "staffCode");
CREATE UNIQUE INDEX "StaffProfile_schoolId_licenceNumber_key" ON "StaffProfile"("schoolId", "licenceNumber");
CREATE INDEX "StaffProfile_schoolId_status_idx" ON "StaffProfile"("schoolId", "status");
CREATE UNIQUE INDEX "Vehicle_schoolId_registrationNumber_key" ON "Vehicle"("schoolId", "registrationNumber");
CREATE INDEX "Vehicle_schoolId_status_idx" ON "Vehicle"("schoolId", "status");
CREATE INDEX "DriverVehicleAssignment_staffId_endedAt_idx" ON "DriverVehicleAssignment"("staffId", "endedAt");
CREATE INDEX "DriverVehicleAssignment_vehicleId_endedAt_idx" ON "DriverVehicleAssignment"("vehicleId", "endedAt");
CREATE UNIQUE INDEX "DriverVehicleAssignment_one_active_per_staff" ON "DriverVehicleAssignment"("staffId") WHERE "endedAt" IS NULL;
CREATE UNIQUE INDEX "DriverVehicleAssignment_one_active_per_vehicle" ON "DriverVehicleAssignment"("vehicleId") WHERE "endedAt" IS NULL;
CREATE INDEX "VehicleIssue_vehicleId_status_idx" ON "VehicleIssue"("vehicleId", "status");
CREATE INDEX "VehicleIssue_reportedByStaffId_createdAt_idx" ON "VehicleIssue"("reportedByStaffId", "createdAt");

ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleIssue" ADD CONSTRAINT "VehicleIssue_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VehicleIssue" ADD CONSTRAINT "VehicleIssue_reportedByStaffId_fkey" FOREIGN KEY ("reportedByStaffId") REFERENCES "StaffProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
