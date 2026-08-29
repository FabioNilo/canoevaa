-- CreateEnum
CREATE TYPE "ExperienceScheduleMode" AS ENUM ('DAILY_DEFAULT', 'MANUAL');

-- AlterTable
ALTER TABLE "Experience" ADD COLUMN "scheduleMode" "ExperienceScheduleMode" NOT NULL DEFAULT 'DAILY_DEFAULT';
