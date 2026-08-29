-- Data migration: request-only experiences should not use generated daily schedules.
UPDATE "Experience"
SET "scheduleMode" = 'MANUAL'
WHERE "kind" IN ('CELEBRATION', 'EXPEDITION');
