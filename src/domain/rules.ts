import type { ApiError, Experience, ExperienceBookingPolicy, ReservationDraft, ReservationQuote } from "./types";

export const RESERVATION_RULES = {
  generalMinParticipants: 4,
  generalMaxParticipants: 25,
  celebrationMinParticipants: 6,
  paymentDeadlineHoursBeforeActivity: 48,
  currency: "BRL" as const,
};

export function centsToCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function getMinimumParticipants(experience: Experience) {
  return experience.kind === "celebration"
    ? RESERVATION_RULES.celebrationMinParticipants
    : experience.minParticipants;
}

export function getExperienceBookingPolicy(experience: Pick<Experience, "kind" | "scheduleMode">): ExperienceBookingPolicy {
  if (experience.kind === "celebration") {
    return {
      channel: "request",
      canReserveOnline: false,
      canGenerateDefaultSchedule: false,
      publicLabel: "Sob consulta",
      adminLabel: "Comemoracao sob consulta",
      reason: "Comemoracoes exigem alinhamento previo com a equipe.",
    };
  }

  if (experience.kind === "expedition") {
    return {
      channel: "request",
      canReserveOnline: false,
      canGenerateDefaultSchedule: false,
      publicLabel: "Sob consulta",
      adminLabel: "Expedicao sob consulta",
      reason: "Expedicoes dependem de rota, clima e planejamento operacional.",
    };
  }

  return {
    channel: "online",
    canReserveOnline: true,
    canGenerateDefaultSchedule: experience.scheduleMode === "daily_default",
    publicLabel: experience.scheduleMode === "manual" ? "Datas especificas" : "Reserva online",
    adminLabel: experience.scheduleMode === "manual" ? "Regular com datas especificas" : "Regular diario",
  };
}

export function buildReservationQuote(experience: Experience, participantsCount: number): ReservationQuote {
  const errors: ApiError[] = [];
  const minParticipants = getMinimumParticipants(experience);
  const bookingPolicy = getExperienceBookingPolicy(experience);

  if (!bookingPolicy.canReserveOnline) {
    errors.push({
      code: "EXPERIENCE_REQUIRES_REQUEST",
      field: "experienceSlug",
      message: bookingPolicy.reason ?? "Este passeio precisa ser combinado com a equipe.",
    });
  }

  if (participantsCount !== 1) {
    errors.push({
      code: "INDIVIDUAL_RESERVATION_ONLY",
      field: "participantsCount",
      message: "Cada cliente pode reservar apenas uma vaga por passeio.",
    });
  }

  if (participantsCount > experience.maxParticipants) {
    errors.push({
      code: "MAX_PARTICIPANTS",
      field: "participantsCount",
      message: `Esta experiência permite no máximo ${experience.maxParticipants} participantes.`,
    });
  }

  return {
    experienceSlug: experience.slug,
    unitPriceCents: experience.priceCents,
    participantsCount,
    totalCents: experience.priceCents * participantsCount,
    currency: RESERVATION_RULES.currency,
    quotaCost: experience.quotaCost,
    minimumParticipantsToRun: minParticipants,
    valid: errors.length === 0,
    errors,
  };
}

export function validateReservationDraft(experience: Experience, draft: ReservationDraft) {
  const quote = buildReservationQuote(experience, draft.participantsCount);
  const errors = [...quote.errors];

  if (!draft.customer.fullName.trim()) {
    errors.push({ code: "CUSTOMER_NAME_REQUIRED", field: "customer.fullName", message: "Informe o nome do responsável." });
  }

  if (!draft.customer.rg.trim()) {
    errors.push({ code: "CUSTOMER_RG_REQUIRED", field: "customer.rg", message: "Informe o RG do responsável." });
  }

  if (!draft.customer.phone.trim()) {
    errors.push({ code: "CUSTOMER_PHONE_REQUIRED", field: "customer.phone", message: "Informe o telefone do responsável." });
  }

  if (draft.participants.length !== draft.participantsCount) {
    errors.push({
      code: "PARTICIPANTS_COUNT_MISMATCH",
      field: "participants",
      message: "A quantidade de participantes cadastrados precisa bater com a reserva.",
    });
  }

  if (draft.participants.some((participant) => !participant.fullName.trim() || !participant.rg.trim())) {
    errors.push({
      code: "PARTICIPANT_IDENTITY_REQUIRED",
      field: "participants",
      message: "Informe nome e RG do participante para o termo de responsabilidade.",
    });
  }

  if (!draft.acceptedTermsVersion) {
    errors.push({ code: "TERMS_REQUIRED", field: "acceptedTermsVersion", message: "Aceite o termo vigente para continuar." });
  }

  return {
    quote: { ...quote, valid: errors.length === 0, errors },
    errors,
  };
}
