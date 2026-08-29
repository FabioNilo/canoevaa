-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "Customer" ADD COLUMN "rg" TEXT;
ALTER TABLE "ReservationParticipant" ADD COLUMN "rg" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_rg_key" ON "Customer"("rg");

-- One active reservation per customer and experience for the public MVP.
CREATE UNIQUE INDEX "Reservation_customer_experience_active_key"
ON "Reservation"("customerId", "experienceId")
WHERE "status" IN ('WAITING_PAYMENT', 'PAYMENT_CONFIRMED', 'CONFIRMED');
