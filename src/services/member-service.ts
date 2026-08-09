import type { MemberDashboard, Reservation } from "@/domain/types";
import { apiRequest } from "./api-client";

export const memberService = {
  getDashboard() {
    return apiRequest<MemberDashboard>("/api/member/dashboard");
  },

  getReservations() {
    return apiRequest<Reservation[]>("/api/member/reservations");
  },
};
