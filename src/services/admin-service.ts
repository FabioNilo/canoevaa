import type { AdminOverview, AdminPermission, AdminUser, Reservation, ReservationStatus } from "@/domain/types";
import { apiRequest } from "./api-client";

export const adminService = {
  getOverview() {
    return apiRequest<AdminOverview>("/api/admin/overview");
  },

  updateReservationStatus(id: string, status: ReservationStatus) {
    return apiRequest<Reservation>(`/api/admin/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  updateUserPermissions(id: string, permissions: Partial<Record<AdminPermission, boolean>>) {
    return apiRequest<AdminUser>(`/api/admin/users/${id}/permissions`, {
      method: "PATCH",
      body: JSON.stringify({ permissions }),
    });
  },
};
