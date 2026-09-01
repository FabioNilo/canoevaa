import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import type { ApiResponse, UserRole } from "@/domain/types";

export async function getCurrentSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function getCurrentRole() {
  const user = await getCurrentSessionUser();
  return user?.role ?? "public";
}

export async function requireAdminResponse<T>(): Promise<ApiResponse<T> | null> {
  const role = await getCurrentRole();

  if (role !== "admin") {
    return {
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Acesso administrativo restrito.",
      },
    };
  }

  return null;
}

export async function requireRoleResponse<T>(role: Exclude<UserRole, "public">): Promise<ApiResponse<T> | null> {
  const currentRole = await getCurrentRole();

  if (currentRole !== role) {
    return {
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: role === "admin" ? "Acesso administrativo restrito." : "Acesso de associado restrito.",
      },
    };
  }

  return null;
}

export async function requireMemberResponse<T>(): Promise<ApiResponse<T> | null> {
  return requireRoleResponse<T>("member");
}
