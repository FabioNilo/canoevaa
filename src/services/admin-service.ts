import type {
  AdjustMembershipQuotaInput,
  AdminDashboardMode,
  AdminDashboardOverview,
  AdminCustomer,
  AdminMembershipDetail,
  AdminMembershipListItem,
  AdminMembershipPlan,
  AdminOverview,
  AdminPermission,
  AdminUser,
  Canoe,
  CreateMembershipInput,
  MembershipStatus,
  UpdateMembershipInput,
  CreateCanoeInput,
  CreateExperienceInput,
  CreateScheduleSlotInput,
  Experience,
  GenerateScheduleInput,
  GenerateScheduleResult,
  Reservation,
  ReservationStatus,
  ScheduleSlot,
  MutationResult,
  UpdateCanoeInput,
  UpdateExperienceInput,
  UpdateScheduleSlotInput,
} from "@/domain/types";
import { apiRequest } from "./api-client";

export const adminService = {
  getOverview() {
    return apiRequest<AdminOverview>("/api/admin/overview");
  },

  getDashboard(input: { mode: AdminDashboardMode; startDate: string }) {
    const params = new URLSearchParams({
      mode: input.mode,
      startDate: input.startDate,
    });
    return apiRequest<AdminDashboardOverview>(`/api/admin/overview?${params.toString()}`);
  },

  updateReservationStatus(id: string, status: ReservationStatus) {
    return apiRequest<Reservation>(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  listReservations() {
    return apiRequest<Reservation[]>("/api/admin/reservations");
  },

  listSchedule() {
    return apiRequest<ScheduleSlot[]>("/api/admin/schedule");
  },

  listExperiences() {
    return apiRequest<Experience[]>("/api/admin/experiences");
  },

  listCanoes() {
    return apiRequest<Canoe[]>("/api/admin/canoes");
  },

  listCustomers() {
    return apiRequest<AdminCustomer[]>("/api/admin/customers");
  },

  listMemberships() {
    return apiRequest<AdminMembershipListItem[]>("/api/admin/memberships");
  },

  getMembership(id: string) {
    return apiRequest<AdminMembershipDetail>(`/api/admin/memberships/${id}`);
  },

  listMembershipPlans() {
    return apiRequest<AdminMembershipPlan[]>("/api/admin/membership-plans");
  },

  createMembership(input: CreateMembershipInput) {
    return apiRequest<AdminMembershipDetail>("/api/admin/memberships", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateMembershipStatus(id: string, status: MembershipStatus) {
    return apiRequest<AdminMembershipDetail>(`/api/admin/memberships/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  updateMembership(id: string, input: UpdateMembershipInput) {
    return apiRequest<AdminMembershipDetail>(`/api/admin/memberships/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  deleteMembership(id: string) {
    return apiRequest<MutationResult>(`/api/admin/memberships/${id}`, {
      method: "DELETE",
    });
  },

  adjustMembershipQuota(id: string, input: AdjustMembershipQuotaInput) {
    return apiRequest<AdminMembershipDetail>(`/api/admin/memberships/${id}/quota`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  renewMembershipPeriods() {
    return apiRequest<{ processed: number }>("/api/admin/memberships/renew", {
      method: "POST",
    });
  },

  createExperience(input: CreateExperienceInput) {
    return apiRequest<Experience>("/api/admin/experiences", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateExperience(id: string, input: UpdateExperienceInput) {
    return apiRequest<Experience>(`/api/admin/experiences/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  deleteExperience(id: string) {
    return apiRequest<MutationResult>(`/api/admin/experiences/${id}`, {
      method: "DELETE",
    });
  },

  createCanoe(input: CreateCanoeInput) {
    return apiRequest<Canoe>("/api/admin/canoes", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateCanoe(id: string, input: UpdateCanoeInput) {
    return apiRequest<Canoe>(`/api/admin/canoes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  deleteCanoe(id: string) {
    return apiRequest<MutationResult>(`/api/admin/canoes/${id}`, {
      method: "DELETE",
    });
  },

  createScheduleSlot(input: CreateScheduleSlotInput) {
    return apiRequest<ScheduleSlot>("/api/admin/schedule", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  generateSchedule(input: GenerateScheduleInput) {
    return apiRequest<GenerateScheduleResult>("/api/admin/schedule/generate", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateScheduleSlot(id: string, input: UpdateScheduleSlotInput) {
    return apiRequest<ScheduleSlot>(`/api/admin/schedule/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  deleteScheduleSlot(id: string) {
    return apiRequest<MutationResult>(`/api/admin/schedule/${id}`, {
      method: "DELETE",
    });
  },

  updateUserPermissions(id: string, permissions: Partial<Record<AdminPermission, boolean>>) {
    return apiRequest<AdminUser>(`/api/admin/users/${id}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions }),
    });
  },
};
