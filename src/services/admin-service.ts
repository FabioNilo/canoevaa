import type {
  AdminDashboardMode,
  AdminDashboardOverview,
  AdminOverview,
  AdminPermission,
  AdminUser,
  Canoe,
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

  updateUserPermissions(id: string, permissions: Partial<Record<AdminPermission, boolean>>) {
    return apiRequest<AdminUser>(`/api/admin/users/${id}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions }),
    });
  },
};
