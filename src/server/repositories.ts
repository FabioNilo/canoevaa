import type {
  AdminOverview,
  AdminPermission,
  AdminUser,
  ApiResponse,
  AvailabilitySlot,
  Experience,
  MemberDashboard,
  Reservation,
  ReservationDraft,
  ReservationStatus,
} from "@/domain/types";
import { buildReservationQuote, validateReservationDraft } from "@/domain/rules";
import {
  activeTerm,
  adminOverview,
  adminUsers,
  availabilitySlots,
  experiences,
  memberDashboard,
  reservations,
} from "./mock-data";

function ok<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { data, error: null, meta };
}

function fail<T>(code: string, message: string, field?: string): ApiResponse<T> {
  return { data: null, error: { code, message, field } };
}

export const experienceRepository = {
  list(): ApiResponse<Experience[]> {
    return ok(experiences.filter((experience) => experience.isActive), { source: "mock" });
  },

  getBySlug(slug: string): ApiResponse<Experience> {
    const experience = experiences.find((item) => item.slug === slug && item.isActive);
    return experience ? ok(experience, { source: "mock" }) : fail("EXPERIENCE_NOT_FOUND", "Experiência não encontrada.");
  },
};

export const availabilityRepository = {
  list(experienceSlug?: string): ApiResponse<AvailabilitySlot[]> {
    const slots = experienceSlug
      ? availabilitySlots.filter((slot) => slot.experienceSlug === experienceSlug)
      : availabilitySlots;
    return ok(slots, { source: "mock" });
  },
};

export const reservationRepository = {
  quote(input: { experienceSlug: string; participantsCount: number }) {
    const experience = experiences.find((item) => item.slug === input.experienceSlug);

    if (!experience) {
      return fail("EXPERIENCE_NOT_FOUND", "Experiência não encontrada.", "experienceSlug");
    }

    return ok(buildReservationQuote(experience, input.participantsCount), { source: "mock" });
  },

  create(draft: ReservationDraft): ApiResponse<Reservation> {
    const experience = experiences.find((item) => item.slug === draft.experienceSlug);

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

    const now = new Date().toISOString();
    const reservation: Reservation = {
      id: `reservation_${Date.now()}`,
      code: `ICV-${Math.floor(1000 + Math.random() * 9000)}`,
      experienceSlug: experience.slug,
      experienceName: experience.name,
      date: draft.date,
      time: draft.time,
      participantsCount: draft.participantsCount,
      customer: draft.customer,
      participants: draft.participants,
      quote: validation.quote,
      payment: {
        id: `pay_${Date.now()}`,
        method: draft.paymentMethod,
        status: draft.paymentMethod === "pix" ? "waiting_payment" : "pending",
        amountCents: validation.quote.totalCents,
        dueAt: now,
        pixCopyPaste: draft.paymentMethod === "pix" ? "00020101021226880014br.gov.bcb.pix.mock" : undefined,
      },
      status: "waiting_payment",
      createdAt: now,
    };

    reservations.unshift(reservation);
    adminOverview.confirmations = reservations;
    adminOverview.pendingPayments = reservations.filter((item) => item.status === "waiting_payment").length;

    return ok(reservation, { source: "mock" });
  },
};

export const memberRepository = {
  dashboard(): ApiResponse<MemberDashboard> {
    return ok(memberDashboard, { source: "mock", role: "member" });
  },

  reservations(): ApiResponse<Reservation[]> {
    return ok(reservations, { source: "mock", role: "member" });
  },
};

export const adminRepository = {
  overview(): ApiResponse<AdminOverview> {
    return ok(adminOverview, { source: "mock", role: "admin" });
  },

  updateReservationStatus(id: string, status: ReservationStatus): ApiResponse<Reservation> {
    const reservation = reservations.find((item) => item.id === id || item.code === id);

    if (!reservation) {
      return fail("RESERVATION_NOT_FOUND", "Reserva não encontrada.");
    }

    reservation.status = status;
    reservation.payment.status = status === "confirmed" ? "confirmed" : reservation.payment.status;
    adminOverview.confirmations = reservations;
    adminOverview.pendingPayments = reservations.filter((item) => item.status === "waiting_payment").length;

    return ok(reservation, { source: "mock", role: "admin" });
  },

  updateUserPermissions(id: string, permissions: Partial<Record<AdminPermission, boolean>>): ApiResponse<AdminUser> {
    const user = adminUsers.find((item) => item.id === id);

    if (!user) {
      return fail("ADMIN_USER_NOT_FOUND", "Usuário administrativo não encontrado.");
    }

    user.permissions = { ...user.permissions, ...permissions };
    adminOverview.users = adminUsers;

    return ok(user, { source: "mock", role: "admin" });
  },
};

export const termsRepository = {
  active() {
    return ok(activeTerm, { source: "mock" });
  },
};
