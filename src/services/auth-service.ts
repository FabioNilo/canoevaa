import type { UserRole } from "@/domain/types";

export const authService = {
  getCurrentRole(): UserRole {
    if (typeof window === "undefined") {
      return "public";
    }

    return (window.sessionStorage.getItem("mockRole") as UserRole | null) ?? "public";
  },

  setCurrentRole(role: UserRole) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("mockRole", role);
    }
  },

  canAccess(requiredRole: UserRole) {
    const currentRole = this.getCurrentRole();
    return requiredRole === "public" || currentRole === requiredRole;
  },
};
