WITH exp AS (
  SELECT id
  FROM "Experience"
  WHERE name = 'Teste Operacional'
),
slot_ids AS (
  SELECT id
  FROM "ScheduleSlot"
  WHERE "experienceId" IN (SELECT id FROM exp)
),
res_ids AS (
  SELECT id
  FROM "Reservation"
  WHERE "experienceId" IN (SELECT id FROM exp)
)
DELETE FROM "ReservationParticipant"
WHERE "reservationId" IN (SELECT id FROM res_ids);

DELETE FROM "Payment"
WHERE "reservationId" IN (SELECT id FROM res_ids);

DELETE FROM "Reservation"
WHERE "experienceId" IN (SELECT id FROM exp);

DELETE FROM "ScheduleSlotCanoe"
WHERE "scheduleSlotId" IN (SELECT id FROM slot_ids);

DELETE FROM "ScheduleSlot"
WHERE "experienceId" IN (SELECT id FROM exp);

DELETE FROM "ExperienceImage"
WHERE "experienceId" IN (SELECT id FROM exp);

DELETE FROM "Experience"
WHERE name = 'Teste Operacional';