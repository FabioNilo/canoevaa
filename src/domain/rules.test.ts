import { describe, expect, it } from "vitest";
import type { Experience } from "./types";
import { buildReservationQuote, getExperienceBookingPolicy, getMinimumParticipants, validateReservationDraft } from "./rules";

const baseExperience: Experience = {
  id: "exp_test",
  slug: "teste",
  name: "Teste",
  kind: "regular",
  shortDescription: "Teste",
  description: "Teste",
  priceCents: 3500,
  currency: "BRL",
  durationMinutes: 90,
  scheduleLabel: "16:30 as 18:00",
  scheduleMode: "daily_default",
  minParticipants: 4,
  maxParticipants: 25,
  meetingPoint: "Praia do Cristo",
  difficulty: "iniciante",
  quotaCost: 1,
  imageClass: "canoe-coast",
  availableTimes: ["16:30"],
  includedItems: [],
  guidance: [],
  safetyNotes: [],
  galleryImages: [],
  isActive: true,
};

const validDraft = {
  experienceSlug: "teste",
  date: "2026-09-20",
  time: "16:30",
  participantsCount: 1,
  customer: {
    fullName: "Cliente Teste",
    rg: "1234567",
    phone: "(73) 99999-0000",
  },
  participants: [
    {
      id: "p1",
      fullName: "Cliente Teste",
      rg: "1234567",
      phone: "(73) 99999-0000",
      termsAccepted: true,
    },
  ],
  paymentMethod: "pix" as const,
  acceptedTermsVersion: "2026.1",
};

describe("regras de reserva", () => {
  it("permite reserva individual mesmo antes do minimo operacional da saida", () => {
    const quote = buildReservationQuote(baseExperience, 1);

    expect(quote.valid).toBe(true);
    expect(quote.minimumParticipantsToRun).toBe(4);
    expect(quote.totalCents).toBe(3500);
  });

  it("bloqueia reserva com mais de uma vaga por cliente", () => {
    const quote = buildReservationQuote(baseExperience, 2);

    expect(quote.valid).toBe(false);
    expect(quote.errors[0]?.code).toBe("INDIVIDUAL_RESERVATION_ONLY");
  });

  it("mantem minimo 6 como regra operacional para comemoracoes", () => {
    const minimumParticipants = getMinimumParticipants({ ...baseExperience, kind: "celebration", minParticipants: 4 });

    expect(minimumParticipants).toBe(6);
  });

  it("classifica comemoracoes e expedicoes como sob consulta", () => {
    const celebrationPolicy = getExperienceBookingPolicy({ ...baseExperience, kind: "celebration" });
    const expeditionPolicy = getExperienceBookingPolicy({ ...baseExperience, kind: "expedition" });

    expect(celebrationPolicy.canReserveOnline).toBe(false);
    expect(expeditionPolicy.canReserveOnline).toBe(false);
  });

  it("bloqueia reserva online de passeio sob consulta", () => {
    const quote = buildReservationQuote({ ...baseExperience, kind: "celebration" }, 1);

    expect(quote.valid).toBe(false);
    expect(quote.errors.some((error) => error.code === "EXPERIENCE_REQUIRES_REQUEST")).toBe(true);
  });

  it("exige nome, RG e telefone do responsavel", () => {
    const result = validateReservationDraft(baseExperience, {
      ...validDraft,
      customer: { fullName: "", rg: "", phone: "" },
      participants: [{ id: "p1", fullName: "", rg: "", termsAccepted: true }],
    });

    expect(result.errors.some((error) => error.code === "CUSTOMER_NAME_REQUIRED")).toBe(true);
    expect(result.errors.some((error) => error.code === "CUSTOMER_RG_REQUIRED")).toBe(true);
    expect(result.errors.some((error) => error.code === "CUSTOMER_PHONE_REQUIRED")).toBe(true);
  });

  it("exige termo aceito no payload final", () => {
    const result = validateReservationDraft(baseExperience, {
      ...validDraft,
      acceptedTermsVersion: "",
    });

    expect(result.errors.some((error) => error.code === "TERMS_REQUIRED")).toBe(true);
  });
});
