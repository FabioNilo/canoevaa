import type {
  AdjustMembershipQuotaInput,
  AdminDashboardDay,
  AdminDashboardMode,
  AdminDashboardOverview,
  AdminMembershipDetail,
  AdminMembershipListItem,
  AdminMembershipPlan,
  AdminOverview,
  AdminPermission,
  AdminCustomer,
  AdminCustomerReservation,
  AdminUser,
  ApiError,
  ApiResponse,
  CreateMembershipInput,
  MembershipCustomerInput,
  MembershipPaymentStatus,
  MembershipStatus,
  QuotaMovementType,
  QuotaPeriod,
  UpdateMembershipInput,
  AvailabilitySlot,
  Canoe,
  CreateCanoeInput,
  CreateExperienceInput,
  GenerateScheduleInput,
  GenerateScheduleResult,
  Customer,
  Experience,
  ExperienceImage,
  Participant,
  Payment,
  PaymentMethod,
  Reservation,
  ReservationDraft,
  ReservationStatus,
  ScheduleSlot,
  MutationResult,
  UpdateCanoeInput,
  UpdateExperienceInput,
} from "@/domain/types";
import {
  RESERVATION_RULES,
  buildReservationQuote,
  getExperienceBookingPolicy,
  getMinimumParticipants,
  validateReservationDraft,
} from "@/domain/rules";
import {
  currentPeriod,
  debitIdempotencyKey,
  expireIdempotencyKey,
  grantIdempotencyKey,
  refundIdempotencyKey,
} from "@/domain/membership-rules";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/server/payments";
import {
  ExperienceKind as DbExperienceKind,
  ExperienceScheduleMode as DbExperienceScheduleMode,
  ExperienceStatus as DbExperienceStatus,
  Prisma,
} from "@prisma/client";
import {
  activeTerm,
  adminMemberships,
  adminOverview,
  adminUsers,
  availabilitySlots,
  canoes as mockCanoes,
  experiences,
  memberDashboard,
  membershipPlans,
  reservations,
  scheduleSlots,
} from "./mock-data";

type ScheduleSlotCanoeInput = {
  canoeId: string;
  capacity: number;
};

type CreateScheduleSlotInput = {
  experienceSlug: string;
  date: string;
  time: string;
  capacityTotal?: number;
  canoeId?: string;
  canoes?: ScheduleSlotCanoeInput[];
  blockedReason?: string;
  adminNotes?: string;
  meetingPointOverride?: string;
  priceOverrideCents?: number;
  bookingCutoffAt?: string;
};

type UpdateScheduleSlotInput = {
  status?: "open" | "blocked" | "cancelled";
  date?: string;
  time?: string;
  capacityTotal?: number;
  canoes?: ScheduleSlotCanoeInput[];
  blockedReason?: string | null;
  adminNotes?: string | null;
  meetingPointOverride?: string | null;
  priceOverrideCents?: number | null;
  bookingCutoffAt?: string | null;
};

const scheduleSlotInclude = {
  experience: true,
  canoes: { include: { canoe: true }, orderBy: { sortOrder: "asc" as const } },
  reservations: {
    select: { status: true, participantsCount: true },
  },
};

const activeDbReservationStatuses = new Set(["WAITING_PAYMENT", "PAYMENT_CONFIRMED", "CONFIRMED"]);
const confirmedDbReservationStatuses = new Set(["PAYMENT_CONFIRMED", "CONFIRMED"]);
const pendingDbReservationStatuses = new Set(["WAITING_PAYMENT"]);
const activeReservationStatuses = new Set<ReservationStatus>(["waiting_payment", "confirmed"]);

type DbExperience = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  durationMinutes: number;
  scheduleLabel: string;
  scheduleMode: string;
  minimumParticipants: number;
  maximumParticipants: number;
  meetingPoint: string;
  difficulty: string;
  quotaCost: number;
  imageClass: string;
  availableTimes: string[];
  includedItems: string[];
  guidance: string[];
  safetyNotes: string[];
  status: string;
  images: Array<{
    id: string;
    src: string;
    alt: string;
    caption: string | null;
    objectPosition: string | null;
  }>;
};

type DbReservation = {
  id: string;
  code: string;
  date: string;
  time: string;
  participantsCount: number;
  unitPriceCents: number;
  totalCents: number;
  quotaCost: number;
  status: string;
  acceptedTermsVersion: string;
  createdAt: Date;
  experience: { slug: string; name: string; kind: string; minimumParticipants: number };
  customer: {
    name: string;
    cpf: string | null;
    rg: string | null;
    birthDate: Date | null;
    phone: string;
    email: string | null;
    addressLine: string | null;
  };
  participants: Array<{
    id: string;
    name: string;
    cpf: string | null;
    rg: string | null;
    birthDate: Date | null;
    isMinor: boolean;
    guardianName: string | null;
  }>;
  payment: {
    id: string;
    method: string;
    status: string;
    amountCents: number;
    expiresAt: Date | null;
    pixCopyPaste: string | null;
    pixQrCodeUrl: string | null;
  } | null;
};

type DbScheduleSlot = {
  id: string;
  date: string;
  time: string;
  startsAt: Date;
  capacityTotal: number;
  bookedCount: number;
  status: string;
  canoeId: string | null;
  blockedReason: string | null;
  adminNotes: string | null;
  meetingPointOverride: string | null;
  priceOverrideCents: number | null;
  bookingCutoffAt: Date | null;
  experience: { slug: string; name: string; kind: string; minimumParticipants: number };
  canoes: Array<{
    id: string;
    canoeId: string;
    capacity: number;
    sortOrder: number;
    canoe: { name: string };
  }>;
  reservations: Array<{
    status: string;
    participantsCount: number;
  }>;
};

type DbCustomer = {
  id: string;
  name: string;
  cpf: string | null;
  rg: string | null;
  phone: string;
  email: string | null;
  reservations: DbReservation[];
};

function ok<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { data, error: null, meta };
}

function fail<T>(code: string, message: string, field?: string): ApiResponse<T> {
  return { data: null, error: { code, message, field } };
}

function mapScheduleMode(mode: string): Experience["scheduleMode"] {
  return mode === "MANUAL" ? "manual" : "daily_default";
}

function scheduleModeToDb(mode?: Experience["scheduleMode"]) {
  if (mode === "manual") return DbExperienceScheduleMode.MANUAL;
  if (mode === "daily_default") return DbExperienceScheduleMode.DAILY_DEFAULT;
  return undefined;
}

function experienceKindToDb(kind: Experience["kind"]) {
  if (kind === "celebration") return DbExperienceKind.CELEBRATION;
  if (kind === "expedition") return DbExperienceKind.EXPEDITION;
  return DbExperienceKind.REGULAR;
}

function mapExperience(experience: DbExperience): Experience {
  return {
    id: experience.id,
    slug: experience.slug,
    name: experience.name,
    kind: experience.kind.toLowerCase() as Experience["kind"],
    shortDescription: experience.shortDescription,
    description: experience.description,
    priceCents: experience.priceCents,
    currency: "BRL",
    durationMinutes: experience.durationMinutes,
    scheduleLabel: experience.scheduleLabel,
    scheduleMode: mapScheduleMode(experience.scheduleMode),
    minParticipants: experience.minimumParticipants,
    maxParticipants: experience.maximumParticipants,
    meetingPoint: experience.meetingPoint,
    difficulty: experience.difficulty as Experience["difficulty"],
    quotaCost: experience.quotaCost,
    imageClass: experience.imageClass,
    availableTimes: experience.availableTimes,
    includedItems: experience.includedItems,
    guidance: experience.guidance,
    safetyNotes: experience.safetyNotes,
    galleryImages: experience.images.map(mapExperienceImage),
    isActive: experience.status === "ACTIVE",
  };
}

function mapExperienceImage(image: DbExperience["images"][number]): ExperienceImage {
  return {
    id: image.id,
    src: image.src,
    alt: image.alt,
    caption: image.caption ?? undefined,
    objectPosition: image.objectPosition ?? undefined,
  };
}

function mapAvailabilityStatus(status: string, availableSpots: number): AvailabilitySlot["status"] {
  if (status === "FULL") return "full";
  if (status !== "OPEN") return "unavailable";
  if (availableSpots <= 0) return "full";
  if (availableSpots <= 4) return "low";
  return "available";
}

function getSlotCapacityTotal(slot: Pick<DbScheduleSlot, "capacityTotal" | "canoes">) {
  const canoeCapacity = slot.canoes.reduce((total, canoe) => total + canoe.capacity, 0);
  return canoeCapacity > 0 ? canoeCapacity : slot.capacityTotal;
}

function getSlotParticipantsByStatus(slot: Pick<DbScheduleSlot, "bookedCount" | "reservations">, statuses: Set<string>) {
  if (slot.reservations.length === 0) {
    return statuses === pendingDbReservationStatuses ? 0 : slot.bookedCount;
  }

  return slot.reservations
    .filter((reservation) => statuses.has(reservation.status))
    .reduce((total, reservation) => total + reservation.participantsCount, 0);
}

function mapScheduleSlot(slot: DbScheduleSlot): ScheduleSlot {
  const capacityTotal = getSlotCapacityTotal(slot);
  const confirmedParticipants = getSlotParticipantsByStatus(slot, confirmedDbReservationStatuses);
  const pendingParticipants = getSlotParticipantsByStatus(slot, pendingDbReservationStatuses);
  const occupiedSpots = getSlotParticipantsByStatus(slot, activeDbReservationStatuses);
  const availableSpots = Math.max(0, capacityTotal - occupiedSpots);
  const publicStatus = mapAvailabilityStatus(slot.status, availableSpots);
  const minimumParticipants =
    slot.experience.kind === "CELEBRATION"
      ? RESERVATION_RULES.celebrationMinParticipants
      : slot.experience.minimumParticipants;

  return {
    id: slot.id,
    experienceSlug: slot.experience.slug,
    experienceName: slot.experience.name,
    date: slot.date,
    time: slot.time,
    startsAt: slot.startsAt.toISOString(),
    canoeId: slot.canoeId ?? undefined,
    canoes: slot.canoes.map((slotCanoe) => ({
      id: slotCanoe.id,
      canoeId: slotCanoe.canoeId,
      canoeName: slotCanoe.canoe.name,
      capacity: slotCanoe.capacity,
    })),
    capacityTotal,
    booked: occupiedSpots,
    occupiedSpots,
    pendingParticipants,
    availableSpots,
    minimumParticipants,
    confirmedParticipants,
    remainingToMinimum: Math.max(0, minimumParticipants - occupiedSpots),
    hasMinimumParticipants: occupiedSpots >= minimumParticipants,
    status: slot.status === "BLOCKED" ? "blocked" : slot.status === "CANCELLED" ? "cancelled" : publicStatus,
    blockedReason: slot.blockedReason ?? undefined,
    adminNotes: slot.adminNotes ?? undefined,
    meetingPointOverride: slot.meetingPointOverride ?? undefined,
    priceOverrideCents: slot.priceOverrideCents ?? undefined,
    bookingCutoffAt: slot.bookingCutoffAt?.toISOString(),
  };
}

function mapAvailabilitySlot(slot: DbScheduleSlot): AvailabilitySlot {
  const scheduleSlot = mapScheduleSlot(slot);
  const status: AvailabilitySlot["status"] =
    scheduleSlot.status === "blocked" || scheduleSlot.status === "cancelled"
      ? "unavailable"
      : scheduleSlot.status;

  return {
    id: scheduleSlot.id,
    experienceSlug: scheduleSlot.experienceSlug,
    date: scheduleSlot.date,
    time: scheduleSlot.time,
    startsAt: scheduleSlot.startsAt,
    canoeId: scheduleSlot.canoeId,
    canoes: scheduleSlot.canoes,
    capacityTotal: scheduleSlot.capacityTotal,
    booked: scheduleSlot.booked,
    occupiedSpots: scheduleSlot.occupiedSpots,
    pendingParticipants: scheduleSlot.pendingParticipants,
    availableSpots: scheduleSlot.availableSpots,
    minimumParticipants: scheduleSlot.minimumParticipants,
    confirmedParticipants: scheduleSlot.confirmedParticipants,
    remainingToMinimum: scheduleSlot.remainingToMinimum,
    hasMinimumParticipants: scheduleSlot.hasMinimumParticipants,
    status,
  };
}

function normalizeSlotCanoes(canoes?: ScheduleSlotCanoeInput[]) {
  return (canoes ?? [])
    .filter((canoe) => canoe.canoeId.trim().length > 0 && Number.isFinite(canoe.capacity))
    .map((canoe) => ({ canoeId: canoe.canoeId, capacity: Math.trunc(canoe.capacity) }));
}

function statusToDb(status?: UpdateScheduleSlotInput["status"]) {
  if (status === "blocked") return "BLOCKED";
  if (status === "cancelled") return "CANCELLED";
  if (status === "open") return "OPEN";
  return undefined;
}

function startsAtFromSlot(date: string, time: string) {
  return new Date(`${date}T${time}:00-03:00`);
}

function dateToInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function normalizeStringList(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function normalizeIdentity(value: string) {
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

function mapAdminCustomerReservation(reservation: Reservation): AdminCustomerReservation {
  return {
    id: reservation.id,
    code: reservation.code,
    experienceName: reservation.experienceName,
    date: reservation.date,
    time: reservation.time,
    participantsCount: reservation.participantsCount,
    status: reservation.status,
    totalCents: reservation.quote.totalCents,
    createdAt: reservation.createdAt,
  };
}

function buildAdminCustomer(input: {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  rg?: string;
  reservations: Reservation[];
}): AdminCustomer {
  const nowDate = dateToInputValue(new Date());
  const mappedReservations = input.reservations.map(mapAdminCustomerReservation);
  const orderedByCreatedAt = [...mappedReservations].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const upcoming = mappedReservations
    .filter((reservation) => reservation.date >= nowDate && ["waiting_payment", "confirmed"].includes(reservation.status))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  return {
    id: input.id,
    name: input.name,
    email: input.email || undefined,
    phone: input.phone,
    cpf: input.cpf || undefined,
    rg: input.rg || undefined,
    totalReservations: mappedReservations.length,
    lastReservation: orderedByCreatedAt[0],
    nextReservation: upcoming[0],
    reservations: orderedByCreatedAt,
  };
}

function mapDbCustomer(customer: DbCustomer): AdminCustomer {
  return buildAdminCustomer({
    id: customer.id,
    name: customer.name,
    email: customer.email ?? undefined,
    phone: customer.phone,
    cpf: customer.cpf ?? undefined,
    rg: customer.rg ?? undefined,
    reservations: customer.reservations.map(mapReservation),
  });
}

function canReserveExperienceOnline(experience: Pick<Experience, "kind" | "scheduleMode">) {
  return getExperienceBookingPolicy(experience).canReserveOnline;
}

function canGenerateDefaultScheduleForExperience(experience: Pick<Experience, "kind" | "scheduleMode">) {
  return getExperienceBookingPolicy(experience).canGenerateDefaultSchedule;
}

function normalizeDashboardMode(mode?: string | null): AdminDashboardMode {
  return mode === "week" ? "week" : "today";
}

function isDateValue(value?: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function buildDateRange(startDate: string, days: number) {
  return Array.from({ length: days }, (_, index) => dateToInputValue(addDays(new Date(`${startDate}T00:00:00.000Z`), index)));
}

function isActiveReservation(reservation: Reservation) {
  return activeReservationStatuses.has(reservation.status);
}

function buildDashboardDay(date: string, schedule: ScheduleSlot[], reservationList: Reservation[]): AdminDashboardDay {
  const slots = schedule.filter((slot) => slot.date === date);
  const reservationsForDay = reservationList.filter((reservation) => reservation.date === date && isActiveReservation(reservation));
  const confirmedReservations = reservationsForDay.filter((reservation) => reservation.status === "confirmed");

  return {
    date,
    slots,
    reservations: reservationsForDay,
    pendingReservations: reservationsForDay.filter((reservation) => reservation.status === "waiting_payment").length,
    confirmedParticipants: confirmedReservations.reduce((total, reservation) => total + reservation.participantsCount, 0),
    availableSpots: slots.reduce((total, slot) => total + slot.availableSpots, 0),
    activeReservations: reservationsForDay.length,
    confirmedRevenueCents: confirmedReservations.reduce((total, reservation) => total + reservation.quote.totalCents, 0),
  };
}

function buildDashboardOverview(
  input: { mode?: string | null; startDate?: string | null },
  schedule: ScheduleSlot[],
  reservationList: Reservation[],
): AdminDashboardOverview {
  const mode = normalizeDashboardMode(input.mode);
  const startDate = isDateValue(input.startDate) ? input.startDate as string : dateToInputValue(new Date());
  const dates = buildDateRange(startDate, mode === "week" ? 7 : 1);
  const endDate = dates[dates.length - 1] ?? startDate;
  const days = dates.map((date) => buildDashboardDay(date, schedule, reservationList));

  return {
    mode,
    startDate,
    endDate,
    metrics: {
      pendingReservations: days.reduce((total, day) => total + day.pendingReservations, 0),
      confirmedParticipants: days.reduce((total, day) => total + day.confirmedParticipants, 0),
      availableSpots: days.reduce((total, day) => total + day.availableSpots, 0),
      activeReservations: days.reduce((total, day) => total + day.activeReservations, 0),
      confirmedRevenueCents: days.reduce((total, day) => total + day.confirmedRevenueCents, 0),
    },
    days,
    schedule: schedule.filter((slot) => slot.date >= startDate && slot.date <= endDate),
    reservations: reservationList.filter((reservation) => reservation.date >= startDate && reservation.date <= endDate && isActiveReservation(reservation)),
  };
}

function defaultExperienceData(input: CreateExperienceInput) {
  return {
    slug: input.slug.trim().toLowerCase(),
    name: input.name.trim(),
    kind: experienceKindToDb(input.kind),
    shortDescription: input.shortDescription.trim(),
    description: input.description.trim(),
    priceCents: Math.trunc(input.priceCents),
    durationMinutes: Math.trunc(input.durationMinutes),
    scheduleLabel: input.scheduleLabel.trim(),
    scheduleMode: scheduleModeToDb(input.scheduleMode) ?? DbExperienceScheduleMode.DAILY_DEFAULT,
    meetingPoint: input.meetingPoint.trim(),
    difficulty: input.difficulty,
    imageClass: input.imageClass.trim() || "canoe-coast",
    availableTimes: normalizeStringList(input.availableTimes),
    includedItems: normalizeStringList(input.includedItems),
    guidance: normalizeStringList(input.guidance),
    safetyNotes: normalizeStringList(input.safetyNotes),
    minimumParticipants: Math.trunc(input.minParticipants),
    maximumParticipants: Math.trunc(input.maxParticipants),
    quotaCost: Math.trunc(input.quotaCost),
    status: input.isActive ? DbExperienceStatus.ACTIVE : DbExperienceStatus.INACTIVE,
  };
}

function partialExperienceData(input: UpdateExperienceInput) {
  return {
    slug: input.slug?.trim().toLowerCase(),
    name: input.name?.trim(),
    kind: input.kind ? experienceKindToDb(input.kind) : undefined,
    shortDescription: input.shortDescription?.trim(),
    description: input.description?.trim(),
    priceCents: input.priceCents === undefined ? undefined : Math.trunc(input.priceCents),
    durationMinutes: input.durationMinutes === undefined ? undefined : Math.trunc(input.durationMinutes),
    scheduleLabel: input.scheduleLabel?.trim(),
    scheduleMode: scheduleModeToDb(input.scheduleMode),
    meetingPoint: input.meetingPoint?.trim(),
    difficulty: input.difficulty,
    imageClass: input.imageClass?.trim(),
    availableTimes: input.availableTimes ? normalizeStringList(input.availableTimes) : undefined,
    includedItems: input.includedItems ? normalizeStringList(input.includedItems) : undefined,
    guidance: input.guidance ? normalizeStringList(input.guidance) : undefined,
    safetyNotes: input.safetyNotes ? normalizeStringList(input.safetyNotes) : undefined,
    minimumParticipants: input.minParticipants === undefined ? undefined : Math.trunc(input.minParticipants),
    maximumParticipants: input.maxParticipants === undefined ? undefined : Math.trunc(input.maxParticipants),
    quotaCost: input.quotaCost === undefined ? undefined : Math.trunc(input.quotaCost),
    status: input.isActive === undefined ? undefined : input.isActive ? DbExperienceStatus.ACTIVE : DbExperienceStatus.INACTIVE,
  };
}

async function validateDbSlotCanoes(canoes: ScheduleSlotCanoeInput[]) {
  if (canoes.length > 2) {
    return fail<never>("TOO_MANY_CANOES", "Use no máximo duas canoas por horário.", "canoes");
  }

  if (canoes.length === 0) return ok([], { source: "postgres" });

  const ids = canoes.map((canoe) => canoe.canoeId);
  if (new Set(ids).size !== ids.length) {
    return fail("DUPLICATED_CANOE", "Selecione cada canoa apenas uma vez.", "canoes");
  }

  const rows = await prisma?.canoe.findMany({
    where: { id: { in: ids }, active: true },
  });

  if (!rows || rows.length !== ids.length) {
    return fail<never>("CANOE_NOT_FOUND", "Selecione apenas canoas ativas.", "canoes");
  }

  for (const canoe of canoes) {
    const dbCanoe = rows.find((row) => row.id === canoe.canoeId);
    if (!dbCanoe || canoe.capacity < 1 || canoe.capacity > dbCanoe.capacity) {
      return fail<never>("CANOE_CAPACITY_INVALID", "A capacidade informada não pode passar o limite da canoa.", "canoes");
    }
  }

  return ok(
    canoes.map((canoe) => {
      const dbCanoe = rows.find((row) => row.id === canoe.canoeId);
      return { canoeId: canoe.canoeId, capacity: dbCanoe?.capacity ?? canoe.capacity };
    }),
    { source: "postgres" },
  );
}

function mapPaymentStatus(status: string): Payment["status"] {
  if (status === "PAID") return "confirmed";
  if (status === "EXPIRED") return "expired";
  if (status === "PENDING") return "waiting_payment";
  return "pending";
}

function mapReservationStatus(status: string): ReservationStatus {
  if (status === "PAYMENT_CONFIRMED" || status === "CONFIRMED") return "confirmed";
  if (status === "CANCELLED") return "cancelled";
  if (status === "REJECTED") return "cancelled";
  return "waiting_payment";
}

function mapCustomer(customer: DbReservation["customer"]): Customer {
  return {
    fullName: customer.name,
    rg: customer.rg ?? "",
    cpf: customer.cpf ?? "",
    birthDate: customer.birthDate?.toISOString().slice(0, 10) ?? "",
    phone: customer.phone,
    email: customer.email ?? "",
    address: customer.addressLine ?? "",
    willParticipate: true,
  };
}

function mapParticipant(participant: DbReservation["participants"][number]): Participant {
  return {
    id: participant.id,
    fullName: participant.name,
    rg: participant.rg ?? "",
    cpf: participant.cpf ?? "",
    birthDate: participant.birthDate?.toISOString().slice(0, 10) ?? "",
    phone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    legalGuardian: participant.guardianName
      ? {
          fullName: participant.guardianName,
          cpf: "",
          phone: "",
          authorizationAccepted: true,
        }
      : undefined,
    termsAccepted: true,
  };
}

function mapReservation(reservation: DbReservation): Reservation {
  const minimumParticipants =
    reservation.experience.kind === "CELEBRATION"
      ? RESERVATION_RULES.celebrationMinParticipants
      : reservation.experience.minimumParticipants;
  const quote = {
    experienceSlug: reservation.experience.slug,
    unitPriceCents: reservation.unitPriceCents,
    participantsCount: reservation.participantsCount,
    totalCents: reservation.totalCents,
    currency: "BRL" as const,
    quotaCost: reservation.quotaCost,
    minimumParticipantsToRun: minimumParticipants,
    valid: true,
    errors: [],
  };

  return {
    id: reservation.id,
    code: reservation.code,
    experienceSlug: reservation.experience.slug,
    experienceName: reservation.experience.name,
    date: reservation.date,
    time: reservation.time,
    participantsCount: reservation.participantsCount,
    customer: mapCustomer(reservation.customer),
    participants: reservation.participants.map(mapParticipant),
    quote,
    payment: {
      id: reservation.payment?.id ?? "",
      method: (reservation.payment?.method ?? "pix") as PaymentMethod,
      status: mapPaymentStatus(reservation.payment?.status ?? "PENDING"),
      amountCents: reservation.payment?.amountCents ?? reservation.totalCents,
      dueAt: reservation.payment?.expiresAt?.toISOString() ?? reservation.createdAt.toISOString(),
      pixCopyPaste: reservation.payment?.pixCopyPaste ?? undefined,
      pixQrCodeUrl: reservation.payment?.pixQrCodeUrl ?? undefined,
    },
    status: mapReservationStatus(reservation.status),
    createdAt: reservation.createdAt.toISOString(),
  };
}

function mapAdminUser(user: { id: string; name: string; role: string; permissions: unknown }): AdminUser {
  const permissions = user.permissions as Partial<Record<AdminPermission, boolean>> | null;

  return {
    id: user.id,
    name: user.name,
    role: user.role === "ADMIN" ? "admin" : "support",
    permissions: {
      reservations: permissions?.reservations ?? true,
      finance: permissions?.finance ?? false,
      members: permissions?.members ?? false,
    },
  };
}

function mapCanoe(canoe: { id: string; name: string; capacity: number; active: boolean }): Canoe {
  return {
    id: canoe.id,
    name: canoe.name,
    capacity: canoe.capacity,
    isActive: canoe.active,
    status: canoe.active ? "available" : "maintenance",
  };
}

async function findExperienceBySlug(slug: string) {
  if (!prisma) {
    return experiences.find((item) => item.slug === slug && item.isActive) ?? null;
  }

  const experience = await prisma.experience.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  return experience && experience.status === "ACTIVE" ? mapExperience(experience) : null;
}

async function listDbReservations() {
  if (!prisma) return reservations;

  const rows = await prisma.reservation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      experience: true,
      customer: true,
      participants: true,
      payment: true,
    },
  });

  return rows.map(mapReservation);
}

export const experienceRepository = {
  async list(): Promise<ApiResponse<Experience[]>> {
    if (!prisma) return ok(experiences.filter((experience) => experience.isActive), { source: "mock" });

    const rows = await prisma.experience.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    return ok(rows.map(mapExperience), { source: "postgres" });
  },

  async getBySlug(slug: string): Promise<ApiResponse<Experience>> {
    const experience = await findExperienceBySlug(slug);
    return experience ? ok(experience, { source: prisma ? "postgres" : "mock" }) : fail("EXPERIENCE_NOT_FOUND", "Experiência não encontrada.");
  },
};

export const availabilityRepository = {
  async list(experienceSlug?: string): Promise<ApiResponse<AvailabilitySlot[]>> {
    const today = dateToInputValue(new Date());

    if (!prisma) {
      const slots = experienceSlug
        ? availabilitySlots.filter((slot) => slot.experienceSlug === experienceSlug)
        : availabilitySlots;
      return ok(
        slots
          .filter((slot) => {
            const experience = experiences.find((item) => item.slug === slot.experienceSlug);
            return Boolean(
              experience &&
                canReserveExperienceOnline(experience) &&
                slot.date >= today &&
                slot.status !== "unavailable",
            );
          })
          .map((slot) => {
            const experience = experiences.find((item) => item.slug === slot.experienceSlug);
            const minimumParticipants = experience ? getMinimumParticipants(experience) : RESERVATION_RULES.generalMinParticipants;
            const capacityTotal = slot.canoes?.reduce((total, canoe) => total + canoe.capacity, 0) || slot.capacityTotal;
            const pendingParticipants = slot.pendingParticipants ?? 0;
            const confirmedParticipants = slot.confirmedParticipants ?? Math.max(0, slot.booked - pendingParticipants);
            const occupiedSpots = slot.occupiedSpots ?? confirmedParticipants + pendingParticipants;

            return {
              ...slot,
              capacityTotal,
              booked: occupiedSpots,
              occupiedSpots,
              pendingParticipants,
              availableSpots: Math.max(0, capacityTotal - occupiedSpots),
              minimumParticipants,
              confirmedParticipants,
              remainingToMinimum: Math.max(0, minimumParticipants - occupiedSpots),
              hasMinimumParticipants: occupiedSpots >= minimumParticipants,
            };
          }),
        { source: "mock" },
      );
    }

    const rows = await prisma.scheduleSlot.findMany({
      where: {
        date: { gte: today },
        status: { in: ["OPEN", "FULL"] },
        experience: {
          kind: "REGULAR",
          ...(experienceSlug ? { slug: experienceSlug } : {}),
        },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      include: scheduleSlotInclude,
    });

    return ok(rows.map(mapAvailabilitySlot), { source: "postgres" });
  },
};

export const reservationRepository = {
  async quote(input: { experienceSlug: string; participantsCount: number }) {
    const experience = await findExperienceBySlug(input.experienceSlug);

    if (!experience) {
      return fail("EXPERIENCE_NOT_FOUND", "Experiência não encontrada.", "experienceSlug");
    }

    return ok(buildReservationQuote(experience, input.participantsCount), { source: prisma ? "postgres" : "mock" });
  },

  async create(draft: ReservationDraft): Promise<ApiResponse<Reservation>> {
    const experience = await findExperienceBySlug(draft.experienceSlug);

    if (!experience) {
      return fail("EXPERIENCE_NOT_FOUND", "Experiência não encontrada.", "experienceSlug");
    }

    const validation = validateReservationDraft(experience, draft);

    if (validation.errors.length > 0) {
      return {
        data: null,
        error: {
          code: "RESERVATION_INVALID",
          message: "Revise os dados da reserva antes de confirmar.",
        },
        meta: { errors: validation.errors },
      };
    }

    if (!prisma) {
      return createMockReservation(draft, experience, validation.quote);
    }

    const slot = await prisma.scheduleSlot.findFirst({
      where: draft.scheduleSlotId
        ? { id: draft.scheduleSlotId }
        : { date: draft.date, time: draft.time, experience: { slug: draft.experienceSlug } },
      include: scheduleSlotInclude,
    });

    if (!slot || slot.status !== "OPEN") {
      return fail("SLOT_UNAVAILABLE", "Horário indisponível para reserva.", "time");
    }

    if (slot.bookingCutoffAt && slot.bookingCutoffAt <= new Date()) {
      return fail("SLOT_CLOSED", "Este horário já encerrou o prazo de reserva.", "time");
    }

    const slotCapacityTotal = getSlotCapacityTotal(slot);
    const occupiedSpots = getSlotParticipantsByStatus(slot, activeDbReservationStatuses);

    if (slotCapacityTotal - occupiedSpots < draft.participantsCount) {
      return fail("SLOT_FULL", "Não há vagas suficientes neste horário.", "participantsCount");
    }

    const code = `ICV-${Math.floor(1000 + Math.random() * 9000)}`;
    const paymentExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2);
    const paymentProvider = getPaymentProvider();
    const customerRg = normalizeIdentity(draft.customer.rg);

    const created = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { rg: customerRg },
        update: {
          name: draft.customer.fullName,
          cpf: draft.customer.cpf?.trim() || null,
          rg: customerRg,
          birthDate: draft.customer.birthDate ? new Date(draft.customer.birthDate) : null,
          phone: draft.customer.phone,
          email: draft.customer.email?.trim() || null,
          addressLine: draft.customer.address?.trim() || null,
        },
        create: {
          name: draft.customer.fullName,
          cpf: draft.customer.cpf?.trim() || null,
          rg: customerRg,
          birthDate: draft.customer.birthDate ? new Date(draft.customer.birthDate) : null,
          phone: draft.customer.phone,
          email: draft.customer.email?.trim() || null,
          addressLine: draft.customer.address?.trim() || null,
        },
      });

      const existingReservation = await tx.reservation.findFirst({
        where: {
          customerId: customer.id,
          experienceId: slot.experienceId,
          status: { in: ["WAITING_PAYMENT", "PAYMENT_CONFIRMED", "CONFIRMED"] },
        },
      });

      if (existingReservation) {
        throw new Error("Este cliente ja possui uma reserva ativa para este passeio.");
      }

      const quotaCost = validation.quote.quotaCost;
      const activeMembership = await tx.membership.findFirst({
        where: { customerId: customer.id, status: "ACTIVE" },
        include: { quotaTransactions: { select: { amount: true } } },
      });
      const quotaBalance = activeMembership
        ? activeMembership.quotaTransactions.reduce((total, movement) => total + movement.amount, 0)
        : 0;
      const membershipForQuota =
        activeMembership && quotaCost > 0 && quotaBalance >= quotaCost ? activeMembership : null;

      const booking = await tx.scheduleSlot.updateMany({
        where: {
          id: slot.id,
          status: "OPEN",
          bookedCount: { lte: slotCapacityTotal - draft.participantsCount },
          OR: [{ bookingCutoffAt: null }, { bookingCutoffAt: { gt: new Date() } }],
        },
        data: {
          bookedCount: { increment: draft.participantsCount },
        },
      });

      if (booking.count !== 1) {
        throw new Error("Não há vagas suficientes neste horário.");
      }

      const reservation = await tx.reservation.create({
        data: {
          code,
          experienceId: slot.experienceId,
          scheduleSlotId: slot.id,
          customerId: customer.id,
          membershipId: membershipForQuota?.id ?? null,
          date: slot.date,
          time: slot.time,
          participantsCount: draft.participantsCount,
          unitPriceCents: membershipForQuota ? 0 : validation.quote.unitPriceCents,
          totalCents: membershipForQuota ? 0 : validation.quote.totalCents,
          quotaCost: validation.quote.quotaCost,
          status: membershipForQuota ? "CONFIRMED" : "WAITING_PAYMENT",
          acceptedTermsVersion: draft.acceptedTermsVersion,
          participants: {
            create: draft.participants.map((participant) => ({
              name: participant.fullName,
              cpf: participant.cpf?.trim() || null,
              rg: normalizeIdentity(participant.rg),
              birthDate: participant.birthDate ? new Date(participant.birthDate) : null,
              isMinor: Boolean(participant.legalGuardian),
              guardianName: participant.legalGuardian?.fullName,
            })),
          },
        },
      });

      if (membershipForQuota) {
        await tx.quotaTransaction.create({
          data: {
            membershipId: membershipForQuota.id,
            reservationId: reservation.id,
            type: "DEBIT",
            amount: -quotaCost,
            reason: `Reserva ${reservation.code}`,
            periodStart: membershipForQuota.currentPeriodStart,
            periodEnd: membershipForQuota.currentPeriodEnd,
            idempotencyKey: debitIdempotencyKey(reservation.id),
          },
        });
      } else {
        const charge = await paymentProvider.createCharge({
          reservationId: reservation.id,
          code: reservation.code,
          customerName: draft.customer.fullName,
          customerEmail: draft.customer.email,
          amountCents: validation.quote.totalCents,
          expiresAt: paymentExpiresAt,
        });

        await tx.payment.create({
          data: {
            reservationId: reservation.id,
            provider: charge.provider,
            method: draft.paymentMethod,
            providerPaymentId: charge.providerPaymentId,
            amountCents: validation.quote.totalCents,
            status: "PENDING",
            pixCopyPaste: charge.pixCopyPaste,
            pixQrCodeUrl: charge.pixQrCodeUrl,
            expiresAt: charge.expiresAt,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "reservation.created",
          entityType: "Reservation",
          entityId: reservation.id,
          metadata: { code: reservation.code, participantsCount: draft.participantsCount },
        },
      });

      return tx.reservation.findUniqueOrThrow({
        where: { id: reservation.id },
        include: { experience: true, customer: true, participants: true, payment: true },
      });
    }).catch((error: Error) => error);

    if (created instanceof Error) {
      const message = created.message;
      if (message.includes("reserva ativa")) {
        return fail("DUPLICATE_EXPERIENCE_RESERVATION", message, "customer.rg");
      }

      if (message.includes("vagas suficientes")) {
        return fail("SLOT_FULL", message, "time");
      }

      return fail("RESERVATION_CREATE_FAILED", "Nao foi possivel criar a reserva.");
    }

    return ok(mapReservation(created), { source: "postgres" });
  },

  async cancel(id: string, reason: string): Promise<ApiResponse<Reservation>> {
    if (!prisma) {
      const reservation = reservations.find((item) => item.id === id || item.code === id);
      if (!reservation) return fail("RESERVATION_NOT_FOUND", "Reserva não encontrada.");
      const wasActive = ["waiting_payment", "confirmed"].includes(reservation.status);
      reservation.status = "cancelled";
      const slot = scheduleSlots.find(
        (item) =>
          item.experienceSlug === reservation.experienceSlug &&
          item.date === reservation.date &&
          item.time === reservation.time,
      );

      if (slot && wasActive) {
        slot.occupiedSpots = Math.max(0, slot.occupiedSpots - reservation.participantsCount);
        slot.booked = slot.occupiedSpots;
        slot.availableSpots = Math.max(0, slot.capacityTotal - slot.occupiedSpots);
        slot.remainingToMinimum = Math.max(0, slot.minimumParticipants - slot.occupiedSpots);
        slot.hasMinimumParticipants = slot.occupiedSpots >= slot.minimumParticipants;
        slot.status = slot.availableSpots === 0 ? "full" : slot.availableSpots <= 4 ? "low" : "available";
      }
      return ok(reservation, { source: "mock" });
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const existing = await tx.reservation.findFirst({
        where: { OR: [{ id }, { code: id }] },
        include: { payment: true },
      });

      if (!existing) throw new Error("Reserva não encontrada.");
      if (existing.status === "CANCELLED") throw new Error("Reserva já cancelada.");

      await tx.scheduleSlot.update({
        where: { id: existing.scheduleSlotId },
        data: { bookedCount: { decrement: existing.participantsCount } },
      });

      await tx.cancellationRequest.create({
        data: {
          reservationId: existing.id,
          reason,
          status: "APPROVED",
          outcome: "CREDIT",
          reviewedAt: new Date(),
        },
      });

      await tx.reservation.update({
        where: { id: existing.id },
        data: { status: "CANCELLED" },
      });

      if (existing.membershipId && existing.quotaCost > 0) {
        await tx.quotaTransaction.create({
          data: {
            membershipId: existing.membershipId,
            reservationId: existing.id,
            type: "REFUND",
            amount: existing.quotaCost,
            reason: `Cancelamento da reserva ${existing.code}`,
            idempotencyKey: refundIdempotencyKey(existing.id),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: "reservation.cancelled",
          entityType: "Reservation",
          entityId: existing.id,
          metadata: { reason },
        },
      });

      return tx.reservation.findUniqueOrThrow({
        where: { id: existing.id },
        include: { experience: true, customer: true, participants: true, payment: true },
      });
    });

    return ok(mapReservation(reservation), { source: "postgres" });
  },
};

function createMockReservation(
  draft: ReservationDraft,
  experience: Experience,
  quote: Reservation["quote"],
): ApiResponse<Reservation> {
  const now = new Date().toISOString();
  const customerRg = normalizeIdentity(draft.customer.rg);
  const duplicate = reservations.some(
    (item) =>
      item.experienceSlug === experience.slug &&
      normalizeIdentity(item.customer.rg) === customerRg &&
      ["waiting_payment", "confirmed"].includes(item.status),
  );

  if (duplicate) {
    return fail("DUPLICATE_EXPERIENCE_RESERVATION", "Este cliente ja possui uma reserva ativa para este passeio.");
  }

  const slot = scheduleSlots.find(
    (item) =>
      item.experienceSlug === experience.slug &&
      item.date === draft.date &&
      item.time === draft.time &&
      item.status !== "full" &&
      item.status !== "unavailable",
  );

  if (!slot || slot.availableSpots < draft.participantsCount) {
    return fail("SLOT_FULL", "Nao ha vagas suficientes neste horario.", "time");
  }

  const reservation: Reservation = {
    id: `reservation_${Date.now()}`,
    code: `ICV-${Math.floor(1000 + Math.random() * 9000)}`,
    experienceSlug: experience.slug,
    experienceName: experience.name,
    date: draft.date,
    time: draft.time,
    participantsCount: draft.participantsCount,
    customer: { ...draft.customer, rg: customerRg },
    participants: draft.participants.map((participant) => ({ ...participant, rg: normalizeIdentity(participant.rg) })),
    quote,
    payment: {
      id: `pay_${Date.now()}`,
      method: draft.paymentMethod,
      status: draft.paymentMethod === "pix" ? "waiting_payment" : "pending",
      amountCents: quote.totalCents,
      dueAt: now,
      pixCopyPaste: draft.paymentMethod === "pix" ? "00020101021226880014br.gov.bcb.pix.mock" : undefined,
    },
    status: "waiting_payment",
    createdAt: now,
  };

  reservations.unshift(reservation);
  slot.occupiedSpots += draft.participantsCount;
  slot.pendingParticipants += draft.participantsCount;
  slot.booked = slot.occupiedSpots;
  slot.availableSpots = Math.max(0, slot.capacityTotal - slot.occupiedSpots);
  slot.remainingToMinimum = Math.max(0, slot.minimumParticipants - slot.occupiedSpots);
  slot.hasMinimumParticipants = slot.occupiedSpots >= slot.minimumParticipants;
  slot.status = slot.availableSpots === 0 ? "full" : slot.availableSpots <= 4 ? "low" : "available";
  adminOverview.confirmations = reservations;
  adminOverview.pendingPayments = reservations.filter((item) => item.status === "waiting_payment").length;

  return ok(reservation, { source: "mock" });
}

export const memberRepository = {
  async dashboard() {
    return ok(memberDashboard, { source: "mock", role: "member" });
  },

  async reservations() {
    return ok(reservations, { source: "mock", role: "member" });
  },
};

export const adminRepository = {
  async dashboard(input: { mode?: string | null; startDate?: string | null } = {}): Promise<ApiResponse<AdminDashboardOverview>> {
    const mode = normalizeDashboardMode(input.mode);
    const startDate = isDateValue(input.startDate) ? input.startDate as string : dateToInputValue(new Date());
    const endDate = dateToInputValue(addDays(new Date(`${startDate}T00:00:00.000Z`), mode === "week" ? 6 : 0));

    if (!prisma) {
      return ok(buildDashboardOverview({ mode, startDate }, scheduleSlots, reservations), { source: "mock", role: "admin" });
    }

    const [reservationRows, scheduleRows] = await Promise.all([
      prisma.reservation.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "desc" }],
        include: { experience: true, customer: true, participants: true, payment: true },
      }),
      prisma.scheduleSlot.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        orderBy: [{ date: "asc" }, { time: "asc" }],
        include: scheduleSlotInclude,
      }),
    ]);

    return ok(
      buildDashboardOverview(
        { mode, startDate },
        scheduleRows.map(mapScheduleSlot),
        reservationRows.map(mapReservation),
      ),
      { source: "postgres", role: "admin" },
    );
  },

  async overview(): Promise<ApiResponse<AdminOverview>> {
    if (!prisma) return ok(adminOverview, { source: "mock", role: "admin" });

    const today = new Date().toISOString().slice(0, 10);
    const [reservationRows, scheduleRows, experienceRows, users, activeMembers] = await Promise.all([
      prisma.reservation.findMany({
        orderBy: { createdAt: "desc" },
        include: { experience: true, customer: true, participants: true, payment: true },
      }),
      prisma.scheduleSlot.findMany({
        where: { date: { gte: today } },
        orderBy: [{ date: "asc" }, { time: "asc" }],
        include: scheduleSlotInclude,
      }),
      prisma.experience.findMany({
        orderBy: { name: "asc" },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { name: "asc" } }),
      prisma.user.count({ where: { role: "MEMBER", active: true } }),
    ]);

    const confirmations = reservationRows.map(mapReservation);
    const schedule = scheduleRows.map(mapScheduleSlot);

    return ok(
      {
        reservationsToday: confirmations.filter((item) => item.date === today).length,
        participantsToday: confirmations
          .filter((item) => item.date === today)
          .reduce((total, item) => total + item.participantsCount, 0),
        availableSpotsToday: schedule
          .filter((item) => item.date === today)
          .reduce((total, item) => total + item.availableSpots, 0),
        confirmedRevenueCents: confirmations
          .filter((item) => item.status === "confirmed")
          .reduce((total, item) => total + item.quote.totalCents, 0),
        pendingPayments: confirmations.filter((item) => item.status === "waiting_payment").length,
        activeMembers,
        confirmations,
        schedule,
        experiences: experienceRows.map(mapExperience),
        users: users.map(mapAdminUser),
      },
      { source: "postgres", role: "admin" },
    );
  },

  async customers(): Promise<ApiResponse<AdminCustomer[]>> {
    if (!prisma) {
      const customersByKey = new Map<string, {
        id: string;
        name: string;
        phone: string;
        email?: string;
        cpf?: string;
        rg?: string;
        reservations: Reservation[];
      }>();

      reservations.forEach((reservation) => {
        const key = normalizeIdentity(reservation.customer.rg || reservation.customer.email || reservation.customer.phone || reservation.customer.fullName);
        const existing = customersByKey.get(key);

        if (existing) {
          existing.reservations.push(reservation);
          return;
        }

        customersByKey.set(key, {
          id: `customer_${key.replace(/[^A-Z0-9]/g, "_").toLowerCase()}`,
          name: reservation.customer.fullName,
          email: reservation.customer.email || undefined,
          phone: reservation.customer.phone,
          cpf: reservation.customer.cpf || undefined,
          rg: reservation.customer.rg || undefined,
          reservations: [reservation],
        });
      });

      return ok(
        Array.from(customersByKey.values())
          .map(buildAdminCustomer)
          .sort((a, b) => a.name.localeCompare(b.name)),
        { source: "mock", role: "admin" },
      );
    }

    const rows = await prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: {
        reservations: {
          orderBy: { createdAt: "desc" },
          include: {
            experience: true,
            customer: true,
            participants: true,
            payment: true,
          },
        },
      },
    });

    return ok(rows.map(mapDbCustomer), { source: "postgres", role: "admin" });
  },

  async experiences(): Promise<ApiResponse<Experience[]>> {
    if (!prisma) return ok(experiences, { source: "mock", role: "admin" });

    const rows = await prisma.experience.findMany({
      orderBy: { name: "asc" },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    return ok(rows.map(mapExperience), { source: "postgres", role: "admin" });
  },

  async canoes(): Promise<ApiResponse<Canoe[]>> {
    if (!prisma) return ok(mockCanoes, { source: "mock", role: "admin" });

    const rows = await prisma.canoe.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });

    return ok(rows.map(mapCanoe), { source: "postgres", role: "admin" });
  },

  async createCanoe(input: CreateCanoeInput): Promise<ApiResponse<Canoe>> {
    const name = input.name.trim();
    const capacity = Math.trunc(input.capacity);

    if (name.length < 2) return fail("CANOE_NAME_REQUIRED", "Informe o nome da canoa.", "name");
    if (capacity < 1 || capacity > 25) return fail("CANOE_CAPACITY_INVALID", "Informe uma capacidade entre 1 e 25.", "capacity");

    if (!prisma) {
      const canoe: Canoe = {
        id: `canoe_${Date.now()}`,
        name,
        capacity,
        isActive: input.isActive,
        status: input.isActive ? "available" : "maintenance",
      };
      mockCanoes.push(canoe);
      return ok(canoe, { source: "mock", role: "admin" });
    }

    const row = await prisma.canoe.create({
      data: {
        name,
        capacity,
        active: input.isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "canoe.created",
        entityType: "Canoe",
        entityId: row.id,
        metadata: { name, capacity, active: input.isActive },
      },
    });

    return ok(mapCanoe(row), { source: "postgres", role: "admin" });
  },

  async updateCanoe(id: string, input: UpdateCanoeInput): Promise<ApiResponse<Canoe>> {
    const name = input.name?.trim();
    const capacity = input.capacity === undefined ? undefined : Math.trunc(input.capacity);

    if (name !== undefined && name.length < 2) return fail("CANOE_NAME_REQUIRED", "Informe o nome da canoa.", "name");
    if (capacity !== undefined && (capacity < 1 || capacity > 25)) {
      return fail("CANOE_CAPACITY_INVALID", "Informe uma capacidade entre 1 e 25.", "capacity");
    }

    if (!prisma) {
      const index = mockCanoes.findIndex((canoe) => canoe.id === id);
      if (index === -1) return fail("CANOE_NOT_FOUND", "Canoa nao encontrada.");

      const current = mockCanoes[index];
      const updated: Canoe = {
        ...current,
        name: name ?? current.name,
        capacity: capacity ?? current.capacity,
        isActive: input.isActive ?? current.isActive,
        status: input.isActive === undefined ? current.status : input.isActive ? "available" : "maintenance",
      };
      mockCanoes[index] = updated;
      return ok(updated, { source: "mock", role: "admin" });
    }

    const existing = await prisma.canoe.findUnique({ where: { id } });
    if (!existing) return fail("CANOE_NOT_FOUND", "Canoa nao encontrada.");

    const row = await prisma.canoe.update({
      where: { id },
      data: {
        name,
        capacity,
        active: input.isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "canoe.updated",
        entityType: "Canoe",
        entityId: row.id,
        metadata: input,
      },
    });

    return ok(mapCanoe(row), { source: "postgres", role: "admin" });
  },

  async deleteCanoe(id: string): Promise<ApiResponse<MutationResult>> {
    if (!prisma) {
      const index = mockCanoes.findIndex((canoe) => canoe.id === id);
      if (index === -1) return fail("CANOE_NOT_FOUND", "Canoa nao encontrada.");

      const inUse = scheduleSlots.some((slot) => slot.canoes?.some((canoe) => canoe.canoeId === id));
      if (inUse) return fail("CANOE_IN_USE", "Esta canoa ja esta vinculada a agenda. Desative em vez de excluir.");

      mockCanoes.splice(index, 1);
      return ok({ id, deleted: true }, { source: "mock", role: "admin" });
    }

    const linkedSlots = await prisma.scheduleSlotCanoe.count({ where: { canoeId: id } });
    const legacySlots = await prisma.scheduleSlot.count({ where: { canoeId: id } });

    if (linkedSlots + legacySlots > 0) {
      return fail("CANOE_IN_USE", "Esta canoa ja esta vinculada a agenda. Desative em vez de excluir.");
    }

    await prisma.canoe.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        action: "canoe.deleted",
        entityType: "Canoe",
        entityId: id,
      },
    });

    return ok({ id, deleted: true }, { source: "postgres", role: "admin" });
  },

  async createExperience(input: CreateExperienceInput): Promise<ApiResponse<Experience>> {
    if (input.minParticipants > input.maxParticipants) {
      return fail("INVALID_PARTICIPANT_LIMITS", "O minimo de participantes nao pode ser maior que o maximo.", "minParticipants");
    }

    if (input.scheduleMode === "daily_default" && normalizeStringList(input.availableTimes).length === 0) {
      return fail("DEFAULT_TIME_REQUIRED", "Informe ao menos um horario sugerido para agenda diaria.", "availableTimes");
    }

    if (!canGenerateDefaultScheduleForExperience(input) && input.scheduleMode === "daily_default") {
      return fail("REQUEST_ONLY_MANUAL_SCHEDULE", "Comemoracoes e expedicoes devem usar datas especificas sob consulta.", "scheduleMode");
    }

    if (!prisma) {
      const exists = experiences.some((experience) => experience.slug === input.slug);
      if (exists) return fail("EXPERIENCE_SLUG_EXISTS", "Ja existe um passeio com este slug.", "slug");

      const experience: Experience = {
        id: `exp_${Date.now()}`,
        currency: "BRL",
        galleryImages: [],
        ...input,
        slug: input.slug.trim().toLowerCase(),
        availableTimes: normalizeStringList(input.availableTimes),
        includedItems: normalizeStringList(input.includedItems),
        guidance: normalizeStringList(input.guidance),
        safetyNotes: normalizeStringList(input.safetyNotes),
      };
      experiences.push(experience);
      adminOverview.experiences = experiences;
      return ok(experience, { source: "mock", role: "admin" });
    }

    const row = await prisma.experience.create({
      data: defaultExperienceData(input),
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    await prisma.auditLog.create({
      data: {
        action: "experience.created",
        entityType: "Experience",
        entityId: row.id,
        metadata: { slug: row.slug, scheduleMode: row.scheduleMode },
      },
    });

    return ok(mapExperience(row), { source: "postgres", role: "admin" });
  },

  async updateExperience(id: string, input: UpdateExperienceInput): Promise<ApiResponse<Experience>> {
    if (input.minParticipants !== undefined && input.maxParticipants !== undefined && input.minParticipants > input.maxParticipants) {
      return fail("INVALID_PARTICIPANT_LIMITS", "O minimo de participantes nao pode ser maior que o maximo.", "minParticipants");
    }

    if (!prisma) {
      const index = experiences.findIndex((experience) => experience.id === id || experience.slug === id);
      if (index === -1) return fail("EXPERIENCE_NOT_FOUND", "Passeio nao encontrado.");

      const current = experiences[index];
      const nextKind = input.kind ?? current.kind;
      const nextScheduleMode = input.scheduleMode ?? current.scheduleMode;
      if (!canGenerateDefaultScheduleForExperience({ kind: nextKind, scheduleMode: nextScheduleMode }) && nextScheduleMode === "daily_default") {
        return fail("REQUEST_ONLY_MANUAL_SCHEDULE", "Comemoracoes e expedicoes devem usar datas especificas sob consulta.", "scheduleMode");
      }

      const updated: Experience = {
        ...current,
        ...input,
        slug: input.slug ? input.slug.trim().toLowerCase() : current.slug,
        availableTimes: input.availableTimes ? normalizeStringList(input.availableTimes) : current.availableTimes,
        includedItems: input.includedItems ? normalizeStringList(input.includedItems) : current.includedItems,
        guidance: input.guidance ? normalizeStringList(input.guidance) : current.guidance,
        safetyNotes: input.safetyNotes ? normalizeStringList(input.safetyNotes) : current.safetyNotes,
      };
      experiences[index] = updated;
      adminOverview.experiences = experiences;
      return ok(updated, { source: "mock", role: "admin" });
    }

    const existing = await prisma.experience.findUnique({ where: { id } });
    if (!existing) return fail("EXPERIENCE_NOT_FOUND", "Passeio nao encontrado.");

    const nextKind = input.kind ?? (existing.kind.toLowerCase() as Experience["kind"]);
    const nextScheduleMode = input.scheduleMode ?? mapScheduleMode(existing.scheduleMode);
    if (!canGenerateDefaultScheduleForExperience({ kind: nextKind, scheduleMode: nextScheduleMode }) && nextScheduleMode === "daily_default") {
      return fail("REQUEST_ONLY_MANUAL_SCHEDULE", "Comemoracoes e expedicoes devem usar datas especificas sob consulta.", "scheduleMode");
    }

    const row = await prisma.experience.update({
      where: { id },
      data: partialExperienceData(input),
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    await prisma.auditLog.create({
      data: {
        action: "experience.updated",
        entityType: "Experience",
        entityId: row.id,
        metadata: input,
      },
    });

    return ok(mapExperience(row), { source: "postgres", role: "admin" });
  },

  async deleteExperience(id: string): Promise<ApiResponse<MutationResult>> {
    if (!prisma) {
      const index = experiences.findIndex((experience) => experience.id === id || experience.slug === id);
      if (index === -1) return fail("EXPERIENCE_NOT_FOUND", "Passeio nao encontrado.");

      const experience = experiences[index];
      const hasSchedule = scheduleSlots.some((slot) => slot.experienceSlug === experience.slug);
      const hasReservations = reservations.some((reservation) => reservation.experienceSlug === experience.slug);

      if (hasSchedule || hasReservations) {
        return fail("EXPERIENCE_IN_USE", "Este passeio ja possui agenda ou reservas. Desative em vez de excluir.");
      }

      experiences.splice(index, 1);
      adminOverview.experiences = experiences;
      return ok({ id: experience.id, deleted: true }, { source: "mock", role: "admin" });
    }

    const existing = await prisma.experience.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            scheduleSlots: true,
            reservations: true,
          },
        },
      },
    });
    if (!existing) return fail("EXPERIENCE_NOT_FOUND", "Passeio nao encontrado.");

    if (existing._count.scheduleSlots > 0 || existing._count.reservations > 0) {
      return fail("EXPERIENCE_IN_USE", "Este passeio ja possui agenda ou reservas. Desative em vez de excluir.");
    }

    await prisma.experience.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        action: "experience.deleted",
        entityType: "Experience",
        entityId: id,
      },
    });

    return ok({ id, deleted: true }, { source: "postgres", role: "admin" });
  },

  async generateSchedule(input: GenerateScheduleInput): Promise<ApiResponse<GenerateScheduleResult>> {
    const daysAhead = Math.max(1, Math.min(120, Math.trunc(input.daysAhead)));
    const startDate = input.startDate || dateToInputValue(new Date());
    const selectedCanoes = normalizeSlotCanoes(input.canoes);

    if (!prisma) {
      const experience = experiences.find((item) => item.slug === input.experienceSlug);
      if (!experience) return fail("EXPERIENCE_NOT_FOUND", "Passeio nao encontrado.", "experienceSlug");
      if (!canGenerateDefaultScheduleForExperience(experience)) {
        return fail("MANUAL_SCHEDULE_ONLY", "Este passeio usa datas especificas ou atendimento sob consulta.", "experienceSlug");
      }

      const time = experience.availableTimes[0];
      if (!time) return fail("DEFAULT_TIME_REQUIRED", "Defina um horario sugerido antes de gerar a agenda.", "experienceSlug");

      const canoes = selectedCanoes.length > 0
        ? selectedCanoes
        : mockCanoes.slice(0, 2).map((canoe) => ({ canoeId: canoe.id, capacity: canoe.capacity }));
      const capacityTotal = canoes.reduce((total, canoe) => total + canoe.capacity, 0);
      const slots: ScheduleSlot[] = [];
      let skipped = 0;
      const minimumParticipants = getMinimumParticipants(experience);

      for (let day = 0; day < daysAhead; day += 1) {
        const date = dateToInputValue(addDays(new Date(`${startDate}T00:00:00.000Z`), day));
        const exists = scheduleSlots.some((slot) => slot.experienceSlug === experience.slug && slot.date === date && slot.time === time);
        if (exists) {
          skipped += 1;
          continue;
        }

        const slot: ScheduleSlot = {
          id: `slot_${Date.now()}_${day}`,
          experienceSlug: experience.slug,
          experienceName: experience.name,
          date,
          time,
          startsAt: startsAtFromSlot(date, time).toISOString(),
          capacityTotal,
          booked: 0,
          occupiedSpots: 0,
          pendingParticipants: 0,
          availableSpots: capacityTotal,
          minimumParticipants,
          confirmedParticipants: 0,
          remainingToMinimum: minimumParticipants,
          hasMinimumParticipants: false,
          status: "available",
          canoes: canoes.map((canoe) => ({
            id: `slot_${Date.now()}_${canoe.canoeId}_${day}`,
            canoeId: canoe.canoeId,
            canoeName: mockCanoes.find((item) => item.id === canoe.canoeId)?.name ?? canoe.canoeId,
            capacity: canoe.capacity,
          })),
        };
        scheduleSlots.push(slot);
        slots.push(slot);
      }

      adminOverview.schedule = scheduleSlots;
      return ok({ created: slots.length, skipped, slots }, { source: "mock", role: "admin" });
    }

    const experience = await prisma.experience.findUnique({ where: { slug: input.experienceSlug } });
    if (!experience) return fail("EXPERIENCE_NOT_FOUND", "Passeio nao encontrado.", "experienceSlug");
    if (!canGenerateDefaultScheduleForExperience({
      kind: experience.kind.toLowerCase() as Experience["kind"],
      scheduleMode: mapScheduleMode(experience.scheduleMode),
    })) {
      return fail("MANUAL_SCHEDULE_ONLY", "Este passeio usa datas especificas ou atendimento sob consulta.", "experienceSlug");
    }

    const time = experience.availableTimes[0];
    if (!time) return fail("DEFAULT_TIME_REQUIRED", "Defina um horario sugerido antes de gerar a agenda.", "experienceSlug");

    const canoes = selectedCanoes.length > 0
      ? selectedCanoes
      : (await prisma.canoe.findMany({ where: { active: true }, orderBy: { name: "asc" }, take: 2 }))
          .map((canoe) => ({ canoeId: canoe.id, capacity: canoe.capacity }));
    const canoeValidation = await validateDbSlotCanoes(canoes);
    if (canoeValidation.error) return fail<GenerateScheduleResult>(
      canoeValidation.error.code,
      canoeValidation.error.message,
      canoeValidation.error.field,
    );

    const capacityTotal = canoes.length > 0
      ? canoes.reduce((total, canoe) => total + canoe.capacity, 0)
      : 10;
    const slots: ScheduleSlot[] = [];
    let skipped = 0;

    for (let day = 0; day < daysAhead; day += 1) {
      const date = dateToInputValue(addDays(new Date(`${startDate}T00:00:00.000Z`), day));
      const existing = await prisma.scheduleSlot.findUnique({
        where: {
          experienceId_date_time: {
            experienceId: experience.id,
            date,
            time,
          },
        },
      });

      if (existing) {
        skipped += 1;
        continue;
      }

      const row = await prisma.scheduleSlot.create({
        data: {
          experienceId: experience.id,
          canoeId: canoes[0]?.canoeId,
          date,
          time,
          startsAt: startsAtFromSlot(date, time),
          capacityTotal,
          status: "OPEN",
          canoes: canoes.length > 0
            ? {
                create: canoes.map((canoe, index) => ({
                  canoeId: canoe.canoeId,
                  capacity: canoe.capacity,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
        include: scheduleSlotInclude,
      });

      slots.push(mapScheduleSlot(row));
    }

    await prisma.auditLog.create({
      data: {
        action: "schedule.generated",
        entityType: "Experience",
        entityId: experience.id,
        metadata: { startDate, daysAhead, created: slots.length, skipped, time },
      },
    });

    return ok({ created: slots.length, skipped, slots }, { source: "postgres", role: "admin" });
  },

  async reservations(): Promise<ApiResponse<Reservation[]>> {
    return ok(await listDbReservations(), { source: prisma ? "postgres" : "mock", role: "admin" });
  },

  async schedule(): Promise<ApiResponse<ScheduleSlot[]>> {
    if (!prisma) return ok(scheduleSlots, { source: "mock", role: "admin" });

    const today = dateToInputValue(new Date());
    const rows = await prisma.scheduleSlot.findMany({
      where: { date: { gte: today } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
      include: scheduleSlotInclude,
    });

    return ok(rows.map(mapScheduleSlot), { source: "postgres", role: "admin" });
  },

  async createScheduleSlot(input: CreateScheduleSlotInput): Promise<ApiResponse<ScheduleSlot>> {
    const selectedCanoes = normalizeSlotCanoes(input.canoes);
    const capacityTotal = selectedCanoes.length > 0
      ? selectedCanoes.reduce((total, canoe) => total + canoe.capacity, 0)
      : (input.capacityTotal ?? 10);
    if (!prisma) {
      const experience = experiences.find((item) => item.slug === input.experienceSlug);
      if (!experience) return fail("EXPERIENCE_NOT_FOUND", "Experiência não encontrada.");
      const slot: ScheduleSlot = {
        id: `slot_${Date.now()}`,
        experienceSlug: experience.slug,
        experienceName: experience.name,
        date: input.date,
        time: input.time,
        startsAt: `${input.date}T${input.time}:00.000Z`,
        capacityTotal,
        booked: 0,
        occupiedSpots: 0,
        pendingParticipants: 0,
        availableSpots: capacityTotal,
        minimumParticipants: getMinimumParticipants(experience),
        confirmedParticipants: 0,
        remainingToMinimum: getMinimumParticipants(experience),
        hasMinimumParticipants: false,
        status: "available",
        canoes: selectedCanoes.map((canoe) => {
          const mockCanoe = mockCanoes.find((item) => item.id === canoe.canoeId);
          return {
            id: `${Date.now()}_${canoe.canoeId}`,
            canoeId: canoe.canoeId,
            canoeName: mockCanoe?.name ?? canoe.canoeId,
            capacity: canoe.capacity,
          };
        }),
        blockedReason: input.blockedReason,
        adminNotes: input.adminNotes,
        meetingPointOverride: input.meetingPointOverride,
        priceOverrideCents: input.priceOverrideCents,
        bookingCutoffAt: input.bookingCutoffAt,
      };
      scheduleSlots.push(slot);
      adminOverview.schedule = scheduleSlots;
      return ok(slot, { source: "mock", role: "admin" });
    }

    const experience = await prisma.experience.findUnique({ where: { slug: input.experienceSlug } });
    if (!experience) return fail("EXPERIENCE_NOT_FOUND", "Experiência não encontrada.");

    const canoeValidation = await validateDbSlotCanoes(selectedCanoes);
    if (canoeValidation.error) return fail<ScheduleSlot>(
      canoeValidation.error.code,
      canoeValidation.error.message,
      canoeValidation.error.field,
    );

    const row = await prisma.scheduleSlot.create({
      data: {
        experienceId: experience.id,
        canoeId: input.canoeId ?? selectedCanoes[0]?.canoeId,
        date: input.date,
        time: input.time,
        startsAt: startsAtFromSlot(input.date, input.time),
        capacityTotal,
        status: "OPEN",
        blockedReason: input.blockedReason,
        adminNotes: input.adminNotes,
        meetingPointOverride: input.meetingPointOverride,
        priceOverrideCents: input.priceOverrideCents,
        bookingCutoffAt: input.bookingCutoffAt ? new Date(input.bookingCutoffAt) : null,
        canoes: selectedCanoes.length > 0
          ? {
              create: selectedCanoes.map((canoe, index) => ({
                canoeId: canoe.canoeId,
                capacity: canoe.capacity,
                sortOrder: index,
              })),
            }
          : undefined,
      },
      include: scheduleSlotInclude,
    });

    await prisma.auditLog.create({
      data: {
        action: "schedule.created",
        entityType: "ScheduleSlot",
        entityId: row.id,
        metadata: { date: input.date, time: input.time, capacityTotal, canoes: selectedCanoes },
      },
    });

    return ok(mapScheduleSlot(row), { source: "postgres", role: "admin" });
  },

  async updateScheduleSlot(
    id: string,
    input: UpdateScheduleSlotInput,
  ): Promise<ApiResponse<ScheduleSlot>> {
    const selectedCanoes = input.canoes ? normalizeSlotCanoes(input.canoes) : undefined;
    if (!prisma) {
      const slot = scheduleSlots.find((item) => item.id === id);
      if (!slot) return fail("SLOT_NOT_FOUND", "Horário não encontrado.");
      slot.status = input.status === "blocked" ? "blocked" : input.status === "cancelled" ? "cancelled" : input.status === "open" ? "available" : slot.status;
      slot.date = input.date ?? slot.date;
      slot.time = input.time ?? slot.time;
      slot.startsAt = `${slot.date}T${slot.time}:00.000Z`;
      slot.capacityTotal = selectedCanoes
        ? selectedCanoes.reduce((total, canoe) => total + canoe.capacity, 0)
        : (input.capacityTotal ?? slot.capacityTotal);
      slot.availableSpots = Math.max(0, slot.capacityTotal - slot.booked);
      slot.canoes = selectedCanoes?.map((canoe) => {
        const mockCanoe = mockCanoes.find((item) => item.id === canoe.canoeId);
        return {
          id: `${slot.id}_${canoe.canoeId}`,
          canoeId: canoe.canoeId,
          canoeName: mockCanoe?.name ?? canoe.canoeId,
          capacity: canoe.capacity,
        };
      }) ?? slot.canoes;
      slot.blockedReason = input.blockedReason ?? slot.blockedReason;
      slot.adminNotes = input.adminNotes ?? slot.adminNotes;
      slot.meetingPointOverride = input.meetingPointOverride ?? slot.meetingPointOverride;
      slot.priceOverrideCents = input.priceOverrideCents ?? slot.priceOverrideCents;
      slot.bookingCutoffAt = input.bookingCutoffAt ?? slot.bookingCutoffAt;
      return ok(slot, { source: "mock", role: "admin" });
    }

    const existing = await prisma.scheduleSlot.findUnique({ where: { id }, include: scheduleSlotInclude });
    if (!existing) return fail("SLOT_NOT_FOUND", "Horário não encontrado.");

    if (selectedCanoes) {
      const canoeValidation = await validateDbSlotCanoes(selectedCanoes);
      if (canoeValidation.error) return fail<ScheduleSlot>(
        canoeValidation.error.code,
        canoeValidation.error.message,
        canoeValidation.error.field,
      );
    }

    const date = input.date ?? existing.date;
    const time = input.time ?? existing.time;
    const capacityTotal = selectedCanoes
      ? selectedCanoes.reduce((total, canoe) => total + canoe.capacity, 0)
      : (input.capacityTotal ?? getSlotCapacityTotal(existing));

    if (capacityTotal < existing.bookedCount) {
      return fail("CAPACITY_TOO_LOW", "A capacidade não pode ser menor que as vagas já ocupadas.", "capacityTotal");
    }

    const row = await prisma.$transaction(async (tx) => {
      if (selectedCanoes) {
        await tx.scheduleSlotCanoe.deleteMany({ where: { scheduleSlotId: id } });
      }

      await tx.scheduleSlot.update({
        where: { id },
        data: {
          status: statusToDb(input.status),
          date,
          time,
          startsAt: date !== existing.date || time !== existing.time ? startsAtFromSlot(date, time) : undefined,
          capacityTotal,
          canoeId: selectedCanoes?.[0]?.canoeId ?? existing.canoeId,
          blockedReason: input.blockedReason === undefined ? undefined : input.blockedReason,
          adminNotes: input.adminNotes === undefined ? undefined : input.adminNotes,
          meetingPointOverride: input.meetingPointOverride === undefined ? undefined : input.meetingPointOverride,
          priceOverrideCents: input.priceOverrideCents === undefined ? undefined : input.priceOverrideCents,
          bookingCutoffAt: input.bookingCutoffAt === undefined ? undefined : input.bookingCutoffAt ? new Date(input.bookingCutoffAt) : null,
          canoes: selectedCanoes
            ? {
                create: selectedCanoes.map((canoe, index) => ({
                  canoeId: canoe.canoeId,
                  capacity: canoe.capacity,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
      });

      return tx.scheduleSlot.findUniqueOrThrow({
        where: { id },
        include: scheduleSlotInclude,
      });
    });

    await prisma.auditLog.create({
      data: {
        action: "schedule.updated",
        entityType: "ScheduleSlot",
        entityId: row.id,
        metadata: input,
      },
    });

    return ok(mapScheduleSlot(row), { source: "postgres", role: "admin" });
  },

  async deleteScheduleSlot(id: string): Promise<ApiResponse<MutationResult>> {
    if (!prisma) {
      const index = scheduleSlots.findIndex((item) => item.id === id);
      if (index === -1) return fail("SLOT_NOT_FOUND", "Horário não encontrado.");

      const slot = scheduleSlots[index];
      const hasReservation = reservations.some(
        (reservation) =>
          reservation.experienceSlug === slot.experienceSlug &&
          reservation.date === slot.date &&
          reservation.time === slot.time,
      );

      if (hasReservation) {
        return fail("SLOT_IN_USE", "Este horário já possui reservas. Cancele ou bloqueie para preservar o histórico.");
      }

      scheduleSlots.splice(index, 1);
      adminOverview.schedule = scheduleSlots;
      return ok({ id, deleted: true }, { source: "mock", role: "admin" });
    }

    const existing = await prisma.scheduleSlot.findUnique({
      where: { id },
      include: { reservations: { select: { id: true } } },
    });

    if (!existing) return fail("SLOT_NOT_FOUND", "Horário não encontrado.");

    if (existing.reservations.length > 0) {
      return fail("SLOT_IN_USE", "Este horário já possui reservas. Cancele ou bloqueie para preservar o histórico.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.scheduleSlot.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          action: "schedule.deleted",
          entityType: "ScheduleSlot",
          entityId: id,
          metadata: { date: existing.date, time: existing.time },
        },
      });
    });

    return ok({ id, deleted: true }, { source: "postgres", role: "admin" });
  },

  async updateReservationStatus(id: string, status: ReservationStatus): Promise<ApiResponse<Reservation>> {
    if (!prisma) {
      const reservation = reservations.find((item) => item.id === id || item.code === id);

      if (!reservation) {
        return fail("RESERVATION_NOT_FOUND", "Reserva não encontrada.");
      }

      const wasActive = ["waiting_payment", "confirmed"].includes(reservation.status);
      const willBeActive = ["waiting_payment", "confirmed"].includes(status);
      const slot = scheduleSlots.find(
        (item) =>
          item.experienceSlug === reservation.experienceSlug &&
          item.date === reservation.date &&
          item.time === reservation.time,
      );

      reservation.status = status;
      reservation.payment.status = status === "confirmed" ? "confirmed" : reservation.payment.status;

      if (slot && wasActive !== willBeActive) {
        const delta = willBeActive ? reservation.participantsCount : -reservation.participantsCount;
        slot.occupiedSpots = Math.max(0, slot.occupiedSpots + delta);
        slot.booked = slot.occupiedSpots;
        slot.availableSpots = Math.max(0, slot.capacityTotal - slot.occupiedSpots);
        slot.remainingToMinimum = Math.max(0, slot.minimumParticipants - slot.occupiedSpots);
        slot.hasMinimumParticipants = slot.occupiedSpots >= slot.minimumParticipants;
        slot.status = slot.availableSpots === 0 ? "full" : slot.availableSpots <= 4 ? "low" : "available";
      }

      adminOverview.confirmations = reservations;
      adminOverview.pendingPayments = reservations.filter((item) => item.status === "waiting_payment").length;

      return ok(reservation, { source: "mock", role: "admin" });
    }

    const dbStatus = status === "confirmed" ? "CONFIRMED" : status === "cancelled" ? "CANCELLED" : "WAITING_PAYMENT";
    const paymentStatus = status === "confirmed" ? "PAID" : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.reservation.findUnique({
        where: { id },
        include: {
          scheduleSlot: { include: scheduleSlotInclude },
        },
      });

      if (!existing) throw new Error("Reserva nao encontrada.");

      const wasActive = activeDbReservationStatuses.has(existing.status);
      const willBeActive = activeDbReservationStatuses.has(dbStatus);
      const delta = (willBeActive ? existing.participantsCount : 0) - (wasActive ? existing.participantsCount : 0);

      if (delta > 0) {
        const capacityTotal = getSlotCapacityTotal(existing.scheduleSlot);
        const booking = await tx.scheduleSlot.updateMany({
          where: {
            id: existing.scheduleSlotId,
            bookedCount: { lte: capacityTotal - delta },
          },
          data: { bookedCount: { increment: delta } },
        });

        if (booking.count !== 1) throw new Error("Nao ha vagas suficientes neste horario.");
      }

      if (delta < 0) {
        await tx.scheduleSlot.update({
          where: { id: existing.scheduleSlotId },
          data: { bookedCount: { decrement: Math.abs(delta) } },
        });
      }

      return tx.reservation.update({
        where: { id },
        data: {
          status: dbStatus,
          payment: paymentStatus ? { update: { status: paymentStatus, paidAt: new Date() } } : undefined,
        },
        include: { experience: true, customer: true, participants: true, payment: true },
      });
    }).catch((error: Error) => error);

    if (updated instanceof Error) {
      if (updated.message.includes("vagas suficientes")) {
        return fail("SLOT_FULL", updated.message, "status");
      }

      return fail("RESERVATION_UPDATE_FAILED", updated.message);
    }

    await prisma.auditLog.create({
      data: {
        action: "reservation.status_updated",
        entityType: "Reservation",
        entityId: updated.id,
        metadata: { status },
      },
    });

    return ok(mapReservation(updated), { source: "postgres", role: "admin" });
  },

  async updateUserPermissions(id: string, permissions: Partial<Record<AdminPermission, boolean>>): Promise<ApiResponse<AdminUser>> {
    if (!prisma) {
      const user = adminUsers.find((item) => item.id === id);

      if (!user) {
        return fail("ADMIN_USER_NOT_FOUND", "Usuário administrativo não encontrado.");
      }

      user.permissions = { ...user.permissions, ...permissions };
      adminOverview.users = adminUsers;

      return ok(user, { source: "mock", role: "admin" });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { permissions },
    });

    await prisma.auditLog.create({
      data: {
        action: "user.permissions_updated",
        entityType: "User",
        entityId: user.id,
        metadata: { permissions },
      },
    });

    return ok(mapAdminUser(user), { source: "postgres", role: "admin" });
  },
};

function mapMembershipStatus(status: string): MembershipStatus {
  switch (status) {
    case "PAST_DUE":
      return "past_due";
    case "SUSPENDED":
      return "suspended";
    case "CANCELLED":
      return "cancelled";
    default:
      return "active";
  }
}

function mapQuotaPeriod(period: string): QuotaPeriod {
  return period === "MONTHLY" ? "monthly" : "weekly";
}

function mapQuotaMovementType(type: string): QuotaMovementType {
  switch (type) {
    case "GRANT":
      return "grant";
    case "REFUND":
      return "refund";
    case "ADJUSTMENT":
      return "adjustment";
    case "EXPIRE":
      return "expire";
    default:
      return "debit";
  }
}

function mapMembershipPaymentStatus(status: string): MembershipPaymentStatus {
  switch (status) {
    case "PAID":
      return "paid";
    case "EXPIRED":
      return "expired";
    case "REFUNDED":
      return "refunded";
    case "CANCELLED":
      return "cancelled";
    default:
      return "pending";
  }
}

function mapMembershipPlan(plan: {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  quotaAllowance: number;
  quotaPeriod: string;
  active: boolean;
}): AdminMembershipPlan {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    priceCents: plan.priceCents,
    quotaAllowance: plan.quotaAllowance,
    quotaPeriod: mapQuotaPeriod(plan.quotaPeriod),
    active: plan.active,
  };
}

function membershipStatusToDb(status: MembershipStatus): "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED" {
  switch (status) {
    case "past_due":
      return "PAST_DUE";
    case "suspended":
      return "SUSPENDED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "ACTIVE";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

const openMembershipPaymentStatuses = new Set(["PENDING", "EXPIRED"]);

const membershipDetailInclude = {
  plan: true,
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      cpf: true,
      rg: true,
      birthDate: true,
      addressLine: true,
      city: true,
      state: true,
      zipCode: true,
    },
  },
  quotaTransactions: {
    orderBy: { createdAt: "desc" as const },
    include: { reservation: { select: { code: true } } },
  },
  payments: { orderBy: { dueAt: "desc" as const } },
} satisfies Prisma.MembershipInclude;

function membershipCustomerCreateData(input: MembershipCustomerInput): Prisma.CustomerCreateInput {
  return {
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || null,
    cpf: input.cpf?.trim() || null,
    rg: input.rg?.trim() ? normalizeIdentity(input.rg) : null,
    birthDate: input.birthDate ? new Date(input.birthDate) : null,
    addressLine: input.addressLine?.trim() || null,
    city: input.city?.trim() || null,
    state: input.state?.trim() || null,
    zipCode: input.zipCode?.trim() || null,
  };
}

function membershipCustomerUpdateData(input: Partial<MembershipCustomerInput>): Prisma.CustomerUpdateInput {
  const data: Prisma.CustomerUpdateInput = {};

  if (input.name !== undefined) data.name = input.name.trim();
  if (input.phone !== undefined) data.phone = input.phone.trim();
  if (input.email !== undefined) data.email = input.email.trim() || null;
  if (input.cpf !== undefined) data.cpf = input.cpf.trim() || null;
  if (input.rg !== undefined) data.rg = input.rg.trim() ? normalizeIdentity(input.rg) : null;
  if (input.birthDate !== undefined) data.birthDate = input.birthDate ? new Date(input.birthDate) : null;
  if (input.addressLine !== undefined) data.addressLine = input.addressLine.trim() || null;
  if (input.city !== undefined) data.city = input.city.trim() || null;
  if (input.state !== undefined) data.state = input.state.trim() || null;
  if (input.zipCode !== undefined) data.zipCode = input.zipCode.trim() || null;

  return data;
}

function validateMembershipCustomer(input: Partial<MembershipCustomerInput>, requireCore: boolean): ApiError | null {
  if ((requireCore || input.name !== undefined) && (input.name ?? "").trim().length < 2) {
    return { code: "CUSTOMER_NAME_REQUIRED", message: "Informe o nome do associado.", field: "customer.name" };
  }
  if ((requireCore || input.phone !== undefined) && (input.phone ?? "").trim().length < 8) {
    return { code: "CUSTOMER_PHONE_REQUIRED", message: "Informe um telefone valido.", field: "customer.phone" };
  }
  if (input.birthDate && Number.isNaN(new Date(input.birthDate).getTime())) {
    return { code: "CUSTOMER_BIRTHDATE_INVALID", message: "Data de nascimento invalida.", field: "customer.birthDate" };
  }
  return null;
}

type MembershipDetailRow = Prisma.MembershipGetPayload<{ include: typeof membershipDetailInclude }>;

function buildMembershipDetail(row: MembershipDetailRow): AdminMembershipDetail {
  const quotaBalance = row.quotaTransactions.reduce((total, tx) => total + tx.amount, 0);
  const quotaUsedInPeriod = row.quotaTransactions
    .filter(
      (tx) =>
        tx.type === "DEBIT" &&
        tx.createdAt >= row.currentPeriodStart &&
        tx.createdAt < row.currentPeriodEnd,
    )
    .reduce((total, tx) => total + Math.abs(tx.amount), 0);

  return {
    id: row.id,
    customerId: row.customer.id,
    customerName: row.customer.name,
    customerPhone: row.customer.phone,
    customerEmail: row.customer.email ?? undefined,
    customer: {
      id: row.customer.id,
      name: row.customer.name,
      phone: row.customer.phone,
      email: row.customer.email ?? undefined,
      cpf: row.customer.cpf ?? undefined,
      rg: row.customer.rg ?? undefined,
      birthDate: row.customer.birthDate?.toISOString().slice(0, 10),
      addressLine: row.customer.addressLine ?? undefined,
      city: row.customer.city ?? undefined,
      state: row.customer.state ?? undefined,
      zipCode: row.customer.zipCode ?? undefined,
    },
    plan: mapMembershipPlan(row.plan),
    status: mapMembershipStatus(row.status),
    startedAt: row.startedAt.toISOString(),
    currentPeriodStart: row.currentPeriodStart.toISOString(),
    currentPeriodEnd: row.currentPeriodEnd.toISOString(),
    nextDueAt: row.nextDueAt.toISOString(),
    quotaBalance,
    quotaUsedInPeriod,
    openPaymentsCount: row.payments.filter((payment) => openMembershipPaymentStatuses.has(payment.status)).length,
    quotaMovements: row.quotaTransactions.map((tx) => ({
      id: tx.id,
      type: mapQuotaMovementType(tx.type),
      amount: tx.amount,
      reason: tx.reason ?? undefined,
      reservationCode: tx.reservation?.code ?? undefined,
      periodStart: tx.periodStart?.toISOString(),
      periodEnd: tx.periodEnd?.toISOString(),
      createdAt: tx.createdAt.toISOString(),
    })),
    payments: row.payments.map((payment) => ({
      id: payment.id,
      amountCents: payment.amountCents,
      status: mapMembershipPaymentStatus(payment.status),
      periodStart: payment.periodStart.toISOString(),
      periodEnd: payment.periodEnd.toISOString(),
      dueAt: payment.dueAt.toISOString(),
      paidAt: payment.paidAt?.toISOString(),
    })),
  };
}

async function loadMembershipDetail(id: string): Promise<ApiResponse<AdminMembershipDetail>> {
  if (!prisma) {
    const membership = adminMemberships.find((item) => item.id === id);
    if (!membership) return fail("MEMBERSHIP_NOT_FOUND", "Associado nao encontrado.");
    return ok(membership, { source: "mock", role: "admin" });
  }

  const row = await prisma.membership.findUnique({ where: { id }, include: membershipDetailInclude });
  if (!row) return fail("MEMBERSHIP_NOT_FOUND", "Associado nao encontrado.");
  return ok(buildMembershipDetail(row), { source: "postgres", role: "admin" });
}

/**
 * Fecha o período vencido de uma associação ativa: expira o saldo não usado e
 * concede a nova cota. Idempotente via `idempotencyKey` — chamadas concorrentes
 * ou repetidas não duplicam lançamentos.
 */
async function ensureCurrentPeriod(membershipId: string): Promise<void> {
  if (!prisma) return;

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { plan: true, quotaTransactions: { select: { amount: true } } },
  });

  if (!membership || membership.status !== "ACTIVE") return;

  const now = new Date();
  if (now < membership.currentPeriodEnd) return;

  const period = currentPeriod(membership.startedAt, mapQuotaPeriod(membership.plan.quotaPeriod), now);
  if (period.start.getTime() <= membership.currentPeriodStart.getTime()) return;

  const balance = membership.quotaTransactions.reduce((total, tx) => total + tx.amount, 0);

  try {
    await prisma.$transaction(async (tx) => {
      if (balance > 0) {
        await tx.quotaTransaction.create({
          data: {
            membershipId,
            type: "EXPIRE",
            amount: -balance,
            reason: "Cotas nao utilizadas expiradas no fim do periodo",
            periodStart: membership.currentPeriodStart,
            periodEnd: membership.currentPeriodEnd,
            idempotencyKey: expireIdempotencyKey(membershipId, period.start),
          },
        });
      }

      await tx.quotaTransaction.create({
        data: {
          membershipId,
          type: "GRANT",
          amount: membership.plan.quotaAllowance,
          reason: "Renovacao automatica do periodo",
          periodStart: period.start,
          periodEnd: period.end,
          idempotencyKey: grantIdempotencyKey(membershipId, period.start),
        },
      });

      await tx.membership.update({
        where: { id: membershipId },
        data: {
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          nextDueAt: period.end,
        },
      });
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
  }
}

export const membershipRepository = {
  async list(): Promise<ApiResponse<AdminMembershipListItem[]>> {
    if (!prisma) {
      return ok(adminMemberships, { source: "mock", role: "admin" });
    }

    const due = await prisma.membership.findMany({
      where: { status: "ACTIVE", currentPeriodEnd: { lte: new Date() } },
      select: { id: true },
    });
    await Promise.all(due.map((membership) => ensureCurrentPeriod(membership.id)));

    const rows = await prisma.membership.findMany({
      orderBy: { createdAt: "desc" },
      include: membershipDetailInclude,
    });

    return ok(rows.map(buildMembershipDetail), { source: "postgres", role: "admin" });
  },

  async detail(id: string): Promise<ApiResponse<AdminMembershipDetail>> {
    await ensureCurrentPeriod(id);
    return loadMembershipDetail(id);
  },

  async plans(): Promise<ApiResponse<AdminMembershipPlan[]>> {
    if (!prisma) {
      return ok(membershipPlans, { source: "mock", role: "admin" });
    }

    const rows = await prisma.membershipPlan.findMany({ orderBy: { priceCents: "asc" } });
    return ok(rows.map(mapMembershipPlan), { source: "postgres", role: "admin" });
  },

  async create(input: CreateMembershipInput): Promise<ApiResponse<AdminMembershipDetail>> {
    const now = new Date();
    const startedAt = input.startedAt ? new Date(input.startedAt) : now;

    if (Number.isNaN(startedAt.getTime())) {
      return fail("MEMBERSHIP_START_INVALID", "Data de inicio invalida.", "startedAt");
    }

    const hasExistingRef = Boolean(input.customerId);
    const hasNewCustomer = Boolean(input.customer);

    if (hasExistingRef === hasNewCustomer) {
      return fail(
        "MEMBERSHIP_CUSTOMER_REQUIRED",
        "Informe um cliente existente ou os dados de um novo cadastro.",
        "customer",
      );
    }

    if (input.customer) {
      const invalid = validateMembershipCustomer(input.customer, true);
      if (invalid) return { data: null, error: invalid };
    }

    if (!prisma) {
      const plan = membershipPlans.find((item) => item.id === input.planId);
      if (!plan) return fail("PLAN_NOT_AVAILABLE", "Plano indisponivel.", "planId");
      if (input.customerId && adminMemberships.some((item) => item.customerId === input.customerId)) {
        return fail("MEMBERSHIP_EXISTS", "Este cliente ja possui uma associacao.", "customerId");
      }

      const customerId = input.customerId ?? `customer_${Date.now()}`;
      const period = currentPeriod(startedAt, plan.quotaPeriod, now);
      const created: AdminMembershipDetail = {
        id: `membership_${Date.now()}`,
        customerId,
        customerName: input.customer?.name.trim() ?? "Cliente",
        customerPhone: input.customer?.phone.trim() ?? "",
        customerEmail: input.customer?.email?.trim() || undefined,
        customer: {
          id: customerId,
          name: input.customer?.name.trim() ?? "Cliente",
          phone: input.customer?.phone.trim() ?? "",
          email: input.customer?.email?.trim() || undefined,
          cpf: input.customer?.cpf?.trim() || undefined,
          rg: input.customer?.rg?.trim() || undefined,
          birthDate: input.customer?.birthDate || undefined,
          addressLine: input.customer?.addressLine?.trim() || undefined,
          city: input.customer?.city?.trim() || undefined,
          state: input.customer?.state?.trim() || undefined,
          zipCode: input.customer?.zipCode?.trim() || undefined,
        },
        plan,
        status: "active",
        startedAt: startedAt.toISOString(),
        currentPeriodStart: period.start.toISOString(),
        currentPeriodEnd: period.end.toISOString(),
        nextDueAt: period.end.toISOString(),
        quotaBalance: plan.quotaAllowance,
        quotaUsedInPeriod: 0,
        openPaymentsCount: 1,
        quotaMovements: [
          {
            id: `qmov_${Date.now()}`,
            type: "grant",
            amount: plan.quotaAllowance,
            reason: "Concessao inicial da associacao",
            createdAt: now.toISOString(),
          },
        ],
        payments: [
          {
            id: `mpay_${Date.now()}`,
            amountCents: plan.priceCents,
            status: "pending",
            periodStart: period.start.toISOString(),
            periodEnd: period.end.toISOString(),
            dueAt: startedAt.toISOString(),
          },
        ],
      };
      adminMemberships.unshift(created);
      return ok(created, { source: "mock", role: "admin" });
    }

    const plan = await prisma.membershipPlan.findUnique({ where: { id: input.planId } });
    if (!plan || !plan.active) return fail("PLAN_NOT_AVAILABLE", "Plano indisponivel.", "planId");

    if (input.customerId) {
      const [customerExists, existing] = await Promise.all([
        prisma.customer.findUnique({ where: { id: input.customerId }, select: { id: true } }),
        prisma.membership.findUnique({ where: { customerId: input.customerId }, select: { id: true } }),
      ]);
      if (!customerExists) return fail("CUSTOMER_NOT_FOUND", "Cliente nao encontrado.", "customerId");
      if (existing) return fail("MEMBERSHIP_EXISTS", "Este cliente ja possui uma associacao.", "customerId");
    }

    if (input.customer?.rg?.trim()) {
      const rgTaken = await prisma.customer.findUnique({
        where: { rg: normalizeIdentity(input.customer.rg) },
        select: { id: true },
      });
      if (rgTaken) return fail("CUSTOMER_RG_TAKEN", "Ja existe um cliente com este RG.", "customer.rg");
    }

    const period = currentPeriod(startedAt, mapQuotaPeriod(plan.quotaPeriod), now);

    const membership = await prisma.$transaction(async (tx) => {
      const customerId = input.customerId
        ? input.customerId
        : (await tx.customer.create({ data: membershipCustomerCreateData(input.customer as MembershipCustomerInput) })).id;

      const record = await tx.membership.create({
        data: {
          customerId,
          planId: plan.id,
          status: "ACTIVE",
          startedAt,
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          nextDueAt: period.end,
        },
      });

      await tx.quotaTransaction.create({
        data: {
          membershipId: record.id,
          type: "GRANT",
          amount: plan.quotaAllowance,
          reason: "Concessao inicial da associacao",
          periodStart: period.start,
          periodEnd: period.end,
          idempotencyKey: grantIdempotencyKey(record.id, period.start),
        },
      });

      await tx.membershipPayment.create({
        data: {
          membershipId: record.id,
          amountCents: plan.priceCents,
          status: "PENDING",
          periodStart: period.start,
          periodEnd: period.end,
          dueAt: startedAt,
        },
      });

      return record;
    });

    await prisma.auditLog.create({
      data: {
        action: "membership.created",
        entityType: "Membership",
        entityId: membership.id,
        metadata: { planId: plan.id, manualCustomer: hasNewCustomer },
      },
    });

    return loadMembershipDetail(membership.id);
  },

  async update(id: string, input: UpdateMembershipInput): Promise<ApiResponse<AdminMembershipDetail>> {
    if (input.customer) {
      const invalid = validateMembershipCustomer(input.customer, false);
      if (invalid) return { data: null, error: invalid };
    }

    const startedAt = input.startedAt ? new Date(input.startedAt) : undefined;
    if (startedAt && Number.isNaN(startedAt.getTime())) {
      return fail("MEMBERSHIP_START_INVALID", "Data de inicio invalida.", "startedAt");
    }

    if (!prisma) {
      const membership = adminMemberships.find((item) => item.id === id);
      if (!membership) return fail("MEMBERSHIP_NOT_FOUND", "Associado nao encontrado.");

      if (input.customer) {
        const next = { ...membership.customer };
        for (const [key, value] of Object.entries(input.customer)) {
          (next as Record<string, unknown>)[key] = typeof value === "string" ? value.trim() || undefined : value;
        }
        membership.customer = next;
        membership.customerName = next.name;
        membership.customerPhone = next.phone;
        membership.customerEmail = next.email;
      }

      if (input.planId) {
        const plan = membershipPlans.find((item) => item.id === input.planId);
        if (!plan) return fail("PLAN_NOT_AVAILABLE", "Plano indisponivel.", "planId");
        membership.plan = plan;
      }

      if (startedAt) {
        const period = currentPeriod(startedAt, membership.plan.quotaPeriod, new Date());
        membership.startedAt = startedAt.toISOString();
        membership.currentPeriodStart = period.start.toISOString();
        membership.currentPeriodEnd = period.end.toISOString();
        membership.nextDueAt = period.end.toISOString();
      }

      if (input.status) membership.status = input.status;

      return ok(membership, { source: "mock", role: "admin" });
    }

    const existing = await prisma.membership.findUnique({
      where: { id },
      include: { plan: true, customer: { select: { id: true } } },
    });
    if (!existing) return fail("MEMBERSHIP_NOT_FOUND", "Associado nao encontrado.");

    let planQuotaPeriod = existing.plan.quotaPeriod;
    if (input.planId && input.planId !== existing.planId) {
      const plan = await prisma.membershipPlan.findUnique({ where: { id: input.planId } });
      if (!plan || !plan.active) return fail("PLAN_NOT_AVAILABLE", "Plano indisponivel.", "planId");
      planQuotaPeriod = plan.quotaPeriod;
    }

    if (input.customer?.rg?.trim()) {
      const rgTaken = await prisma.customer.findUnique({
        where: { rg: normalizeIdentity(input.customer.rg) },
        select: { id: true },
      });
      if (rgTaken && rgTaken.id !== existing.customer.id) {
        return fail("CUSTOMER_RG_TAKEN", "Ja existe um cliente com este RG.", "customer.rg");
      }
    }

    const membershipData: Prisma.MembershipUpdateInput = {};
    if (input.planId && input.planId !== existing.planId) {
      membershipData.plan = { connect: { id: input.planId } };
    }
    if (input.status) {
      membershipData.status = membershipStatusToDb(input.status);
    }
    if (startedAt) {
      const period = currentPeriod(startedAt, mapQuotaPeriod(planQuotaPeriod), new Date());
      membershipData.startedAt = startedAt;
      membershipData.currentPeriodStart = period.start;
      membershipData.currentPeriodEnd = period.end;
      membershipData.nextDueAt = period.end;
    }

    await prisma.$transaction(async (tx) => {
      if (input.customer && Object.keys(input.customer).length > 0) {
        await tx.customer.update({
          where: { id: existing.customer.id },
          data: membershipCustomerUpdateData(input.customer),
        });
      }
      if (Object.keys(membershipData).length > 0) {
        await tx.membership.update({ where: { id }, data: membershipData });
      }
    });

    await prisma.auditLog.create({
      data: {
        action: "membership.updated",
        entityType: "Membership",
        entityId: id,
        metadata: {
          planChanged: Boolean(input.planId && input.planId !== existing.planId),
          startedAtChanged: Boolean(startedAt),
          statusChanged: Boolean(input.status),
          customerChanged: Boolean(input.customer && Object.keys(input.customer).length > 0),
        },
      },
    });

    return loadMembershipDetail(id);
  },

  async remove(id: string): Promise<ApiResponse<MutationResult>> {
    if (!prisma) {
      const index = adminMemberships.findIndex((item) => item.id === id);
      if (index === -1) return fail("MEMBERSHIP_NOT_FOUND", "Associado nao encontrado.");
      adminMemberships.splice(index, 1);
      return ok({ id, deleted: true }, { source: "mock", role: "admin" });
    }

    const existing = await prisma.membership.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return fail("MEMBERSHIP_NOT_FOUND", "Associado nao encontrado.");

    await prisma.$transaction(async (tx) => {
      await tx.quotaTransaction.deleteMany({ where: { membershipId: id } });
      await tx.membershipPayment.deleteMany({ where: { membershipId: id } });
      await tx.membership.delete({ where: { id } });
    });

    await prisma.auditLog.create({
      data: {
        action: "membership.deleted",
        entityType: "Membership",
        entityId: id,
        metadata: {},
      },
    });

    return ok({ id, deleted: true }, { source: "postgres", role: "admin" });
  },

  async adjustQuota(id: string, input: AdjustMembershipQuotaInput): Promise<ApiResponse<AdminMembershipDetail>> {
    const amount = Math.trunc(input.amount);
    const reason = input.reason.trim();

    if (!amount) return fail("QUOTA_ADJUSTMENT_INVALID", "Informe um valor diferente de zero.", "amount");
    if (reason.length < 3) return fail("QUOTA_REASON_REQUIRED", "Descreva o motivo do ajuste.", "reason");

    if (!prisma) {
      const membership = adminMemberships.find((item) => item.id === id);
      if (!membership) return fail("MEMBERSHIP_NOT_FOUND", "Associado nao encontrado.");
      if (membership.quotaBalance + amount < 0) {
        return fail("QUOTA_BALANCE_NEGATIVE", "O ajuste deixaria o saldo de cotas negativo.", "amount");
      }

      membership.quotaBalance += amount;
      membership.quotaMovements = [
        { id: `qmov_${Date.now()}`, type: "adjustment", amount, reason, createdAt: new Date().toISOString() },
        ...membership.quotaMovements,
      ];
      return ok(membership, { source: "mock", role: "admin" });
    }

    const membership = await prisma.membership.findUnique({
      where: { id },
      include: { quotaTransactions: { select: { amount: true } } },
    });
    if (!membership) return fail("MEMBERSHIP_NOT_FOUND", "Associado nao encontrado.");

    const balance = membership.quotaTransactions.reduce((total, tx) => total + tx.amount, 0);
    if (balance + amount < 0) {
      return fail("QUOTA_BALANCE_NEGATIVE", "O ajuste deixaria o saldo de cotas negativo.", "amount");
    }

    await prisma.quotaTransaction.create({
      data: {
        membershipId: id,
        type: "ADJUSTMENT",
        amount,
        reason,
        periodStart: membership.currentPeriodStart,
        periodEnd: membership.currentPeriodEnd,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "membership.quota_adjusted",
        entityType: "Membership",
        entityId: id,
        metadata: { amount, reason },
      },
    });

    return loadMembershipDetail(id);
  },

  async setStatus(id: string, status: MembershipStatus): Promise<ApiResponse<AdminMembershipDetail>> {
    if (!prisma) {
      const membership = adminMemberships.find((item) => item.id === id);
      if (!membership) return fail("MEMBERSHIP_NOT_FOUND", "Associado nao encontrado.");
      membership.status = status;
      return ok(membership, { source: "mock", role: "admin" });
    }

    const existing = await prisma.membership.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return fail("MEMBERSHIP_NOT_FOUND", "Associado nao encontrado.");

    await prisma.membership.update({ where: { id }, data: { status: membershipStatusToDb(status) } });

    await prisma.auditLog.create({
      data: {
        action: "membership.status_changed",
        entityType: "Membership",
        entityId: id,
        metadata: { status },
      },
    });

    return loadMembershipDetail(id);
  },

  async renewDuePeriods(): Promise<ApiResponse<{ processed: number }>> {
    if (!prisma) {
      return ok({ processed: 0 }, { source: "mock", role: "admin" });
    }

    const due = await prisma.membership.findMany({
      where: { status: "ACTIVE", currentPeriodEnd: { lte: new Date() } },
      select: { id: true },
    });
    await Promise.all(due.map((membership) => ensureCurrentPeriod(membership.id)));

    return ok({ processed: due.length }, { source: "postgres", role: "admin" });
  },
};

export const termsRepository = {
  active() {
    return ok(activeTerm, { source: "mock" });
  },
};
