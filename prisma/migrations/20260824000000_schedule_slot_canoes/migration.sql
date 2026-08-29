-- Agenda forte: um horario pode usar ate duas canoas, cada uma com sua capacidade.
ALTER TABLE "ScheduleSlot"
  ADD COLUMN IF NOT EXISTS "blockedReason" TEXT,
  ADD COLUMN IF NOT EXISTS "adminNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "meetingPointOverride" TEXT,
  ADD COLUMN IF NOT EXISTS "priceOverrideCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "bookingCutoffAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ScheduleSlotCanoe" (
  "id" TEXT NOT NULL,
  "scheduleSlotId" TEXT NOT NULL,
  "canoeId" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScheduleSlotCanoe_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ScheduleSlotCanoe_scheduleSlotId_canoeId_key"
  ON "ScheduleSlotCanoe"("scheduleSlotId", "canoeId");

CREATE INDEX IF NOT EXISTS "ScheduleSlotCanoe_canoeId_idx"
  ON "ScheduleSlotCanoe"("canoeId");

ALTER TABLE "ScheduleSlotCanoe"
  ADD CONSTRAINT "ScheduleSlotCanoe_scheduleSlotId_fkey"
  FOREIGN KEY ("scheduleSlotId") REFERENCES "ScheduleSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScheduleSlotCanoe"
  ADD CONSTRAINT "ScheduleSlotCanoe_canoeId_fkey"
  FOREIGN KEY ("canoeId") REFERENCES "Canoe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
