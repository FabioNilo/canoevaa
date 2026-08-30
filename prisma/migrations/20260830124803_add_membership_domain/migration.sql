-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuotaPeriod" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "QuotaTransactionType" AS ENUM ('GRANT', 'DEBIT', 'REFUND', 'ADJUSTMENT', 'EXPIRE');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "membershipId" TEXT;

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "quotaAllowance" INTEGER NOT NULL,
    "quotaPeriod" "QuotaPeriod" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotaTransaction" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "reservationId" TEXT,
    "type" "QuotaTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotaTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPayment" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "provider" TEXT,
    "method" TEXT,
    "providerPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_slug_key" ON "MembershipPlan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_customerId_key" ON "Membership"("customerId");

-- CreateIndex
CREATE INDEX "Membership_planId_idx" ON "Membership"("planId");

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "Membership"("status");

-- CreateIndex
CREATE INDEX "Membership_nextDueAt_idx" ON "Membership"("nextDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuotaTransaction_idempotencyKey_key" ON "QuotaTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "QuotaTransaction_membershipId_createdAt_idx" ON "QuotaTransaction"("membershipId", "createdAt");

-- CreateIndex
CREATE INDEX "QuotaTransaction_reservationId_idx" ON "QuotaTransaction"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPayment_providerPaymentId_key" ON "MembershipPayment"("providerPaymentId");

-- CreateIndex
CREATE INDEX "MembershipPayment_membershipId_dueAt_idx" ON "MembershipPayment"("membershipId", "dueAt");

-- CreateIndex
CREATE INDEX "MembershipPayment_status_idx" ON "MembershipPayment"("status");

-- CreateIndex
CREATE INDEX "Reservation_membershipId_idx" ON "Reservation"("membershipId");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaTransaction" ADD CONSTRAINT "QuotaTransaction_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaTransaction" ADD CONSTRAINT "QuotaTransaction_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPayment" ADD CONSTRAINT "MembershipPayment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
