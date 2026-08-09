import type { Reservation, ReservationDraft, ReservationQuote } from "@/domain/types";
import { apiRequest } from "./api-client";

export const reservationService = {
  quote(input: { experienceSlug: string; participantsCount: number }) {
    return apiRequest<ReservationQuote>("/api/reservations/quote", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  create(input: ReservationDraft) {
    return apiRequest<Reservation>("/api/reservations", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
