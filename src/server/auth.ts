import type { UserRole } from "@/domain/types";

export function getMockRole(pathname: string): UserRole {
  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  if (pathname.startsWith("/associado")) {
    return "member";
  }

  return "public";
}

export function canAccess(requiredRole: UserRole, currentRole: UserRole) {
  if (requiredRole === "public") {
    return true;
  }

  return requiredRole === currentRole;
}
