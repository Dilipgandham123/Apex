CREATE TYPE "PaymentMethod" AS ENUM ('OPENING_BALANCE', 'CASH', 'UPI', 'RAZORPAY');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL, "schoolId" TEXT NOT NULL, "enrollmentId" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL, "refundedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "method" "PaymentMethod" NOT NULL, "status" "PaymentStatus" NOT NULL,
  "receiptNumber" TEXT NOT NULL, "reference" TEXT, "note" TEXT,
  "providerOrderId" TEXT, "providerPaymentId" TEXT, "recordedByUserId" TEXT,
  "verifiedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PaymentRefund" (
  "id" TEXT NOT NULL, "paymentId" TEXT NOT NULL, "amount" DECIMAL(10,2) NOT NULL,
  "status" "RefundStatus" NOT NULL, "reason" TEXT NOT NULL, "providerRefundId" TEXT,
  "createdByUserId" TEXT NOT NULL, "processedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PaymentWebhookEvent" (
  "id" TEXT NOT NULL, "schoolId" TEXT, "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL, "payload" JSONB NOT NULL, "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_providerOrderId_key" ON "Payment"("providerOrderId");
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");
CREATE UNIQUE INDEX "Payment_schoolId_receiptNumber_key" ON "Payment"("schoolId", "receiptNumber");
CREATE INDEX "Payment_enrollmentId_status_createdAt_idx" ON "Payment"("enrollmentId", "status", "createdAt");
CREATE UNIQUE INDEX "PaymentRefund_providerRefundId_key" ON "PaymentRefund"("providerRefundId");
CREATE INDEX "PaymentRefund_paymentId_status_idx" ON "PaymentRefund"("paymentId", "status");
CREATE UNIQUE INDEX "PaymentWebhookEvent_providerEventId_key" ON "PaymentWebhookEvent"("providerEventId");
CREATE INDEX "PaymentWebhookEvent_processedAt_idx" ON "PaymentWebhookEvent"("processedAt");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "DrivingSchool"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive" CHECK ("amount" > 0 AND "refundedAmount" >= 0 AND "refundedAmount" <= "amount");
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_amount_positive" CHECK ("amount" > 0);

INSERT INTO "Payment" ("id", "schoolId", "enrollmentId", "amount", "method", "status", "receiptNumber", "note", "verifiedAt", "createdAt", "updatedAt")
SELECT 'opening_' || e."id", c."schoolId", e."id", e."initialPaid", 'OPENING_BALANCE', 'VERIFIED', 'OPEN-' || upper(substr(e."id", 1, 12)), 'Opening payment migrated from enrollment', e."createdAt", e."createdAt", CURRENT_TIMESTAMP
FROM "CourseEnrollment" e JOIN "CustomerProfile" c ON c."id" = e."customerId" WHERE e."initialPaid" > 0;
