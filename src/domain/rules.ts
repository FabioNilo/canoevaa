import type { ApiError, Experience, ReservationDraft, ReservationQuote } from "./types";

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

export function buildReservationQuote(experience: Experience, participantsCount: number): ReservationQuote {
  const errors: ApiError[] = [];
  const minParticipants = getMinimumParticipants(experience);

  if (participantsCount < minParticipants) {
    errors.push({
      code: "MIN_PARTICIPANTS",
      field: "participantsCount",
      message: `Esta experiência exige no mínimo ${minParticipants} participantes.`,
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

  if (!draft.customer.cpf.trim()) {
    errors.push({ code: "CUSTOMER_CPF_REQUIRED", field: "customer.cpf", message: "Informe o CPF do responsável." });
  }

  if (!draft.customer.birthDate.trim()) {
    errors.push({ code: "CUSTOMER_BIRTH_DATE_REQUIRED", field: "customer.birthDate", message: "Informe a data de nascimento." });
  }

  if (draft.participants.length !== draft.participantsCount) {
    errors.push({
      code: "PARTICIPANTS_COUNT_MISMATCH",
      field: "participants",
      message: "A quantidade de participantes cadastrados precisa bater com a reserva.",
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
