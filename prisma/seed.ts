import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { availabilitySlots, canoes, experiences } from "../src/server/mock-data";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não configurado. Copie .env.example para .env e ajuste a conexão PostgreSQL.");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@ilheus.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      name: "Administrador",
      passwordHash,
      role: "ADMIN",
      active: true,
      permissions: { reservations: true, finance: true, members: true },
    },
    create: {
      name: "Administrador",
      email: adminEmail.toLowerCase(),
      passwordHash,
      role: "ADMIN",
      active: true,
      permissions: { reservations: true, finance: true, members: true },
    },
  });

  for (const canoe of canoes) {
    await prisma.canoe.upsert({
      where: { id: canoe.id },
      update: {
        name: canoe.name,
        capacity: canoe.capacity,
        active: canoe.isActive,
      },
      create: {
        id: canoe.id,
        name: canoe.name,
        capacity: canoe.capacity,
        active: canoe.isActive,
      },
    });
  }

  for (const experience of experiences) {
    const saved = await prisma.experience.upsert({
      where: { slug: experience.slug },
      update: {
        name: experience.name,
        kind: experience.kind.toUpperCase() as "REGULAR" | "CELEBRATION" | "EXPEDITION",
        shortDescription: experience.shortDescription,
        description: experience.description,
        priceCents: experience.priceCents,
        durationMinutes: experience.durationMinutes,
        scheduleLabel: experience.scheduleLabel,
        scheduleMode: experience.scheduleMode === "manual" ? "MANUAL" : "DAILY_DEFAULT",
        meetingPoint: experience.meetingPoint,
        difficulty: experience.difficulty,
        imageClass: experience.imageClass,
        availableTimes: experience.availableTimes,
        includedItems: experience.includedItems,
        guidance: experience.guidance,
        safetyNotes: experience.safetyNotes,
        minimumParticipants: experience.minParticipants,
        maximumParticipants: experience.maxParticipants,
        quotaCost: experience.quotaCost,
        status: experience.isActive ? "ACTIVE" : "INACTIVE",
      },
      create: {
        id: experience.id,
        slug: experience.slug,
        name: experience.name,
        kind: experience.kind.toUpperCase() as "REGULAR" | "CELEBRATION" | "EXPEDITION",
        shortDescription: experience.shortDescription,
        description: experience.description,
        priceCents: experience.priceCents,
        durationMinutes: experience.durationMinutes,
        scheduleLabel: experience.scheduleLabel,
        scheduleMode: experience.scheduleMode === "manual" ? "MANUAL" : "DAILY_DEFAULT",
        meetingPoint: experience.meetingPoint,
        difficulty: experience.difficulty,
        imageClass: experience.imageClass,
        availableTimes: experience.availableTimes,
        includedItems: experience.includedItems,
        guidance: experience.guidance,
        safetyNotes: experience.safetyNotes,
        minimumParticipants: experience.minParticipants,
        maximumParticipants: experience.maxParticipants,
        quotaCost: experience.quotaCost,
        status: experience.isActive ? "ACTIVE" : "INACTIVE",
      },
    });

    for (const [index, image] of experience.galleryImages.entries()) {
      await prisma.experienceImage.upsert({
        where: { id: image.id },
        update: {
          experienceId: saved.id,
          src: image.src,
          alt: image.alt,
          caption: image.caption,
          objectPosition: image.objectPosition,
          sortOrder: index,
        },
        create: {
          id: image.id,
          experienceId: saved.id,
          src: image.src,
          alt: image.alt,
          caption: image.caption,
          objectPosition: image.objectPosition,
          sortOrder: index,
        },
      });
    }
  }

  for (const slot of availabilitySlots) {
    const experience = await prisma.experience.findUniqueOrThrow({
      where: { slug: slot.experienceSlug },
    });

    const savedSlot = await prisma.scheduleSlot.upsert({
      where: {
        experienceId_date_time: {
          experienceId: experience.id,
          date: slot.date,
          time: slot.time,
        },
      },
      update: {
        capacityTotal: slot.capacityTotal,
        bookedCount: slot.booked,
        status: slot.status === "full" ? "FULL" : "OPEN",
      },
      create: {
        experienceId: experience.id,
        date: slot.date,
        time: slot.time,
        startsAt: new Date(`${slot.date}T${slot.time}:00-03:00`),
        capacityTotal: slot.capacityTotal,
        bookedCount: slot.booked,
        status: slot.status === "full" ? "FULL" : "OPEN",
      },
    });

    await prisma.scheduleSlotCanoe.deleteMany({
      where: { scheduleSlotId: savedSlot.id },
    });

    await prisma.scheduleSlotCanoe.createMany({
      data: [
        { scheduleSlotId: savedSlot.id, canoeId: "canoe_1", capacity: 5, sortOrder: 0 },
        { scheduleSlotId: savedSlot.id, canoeId: "canoe_2", capacity: 5, sortOrder: 1 },
      ],
    });
  }

  await prisma.cancellationPolicy.upsert({
    where: { id: "policy_default_2026" },
    update: {
      name: "Política padrão",
      freeCancellationHours: 48,
      creditUntilHours: 24,
      active: true,
    },
    create: {
      id: "policy_default_2026",
      name: "Política padrão",
      freeCancellationHours: 48,
      creditUntilHours: 24,
      active: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
