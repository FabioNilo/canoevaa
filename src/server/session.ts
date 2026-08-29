import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import type { ApiResponse } from "@/domain/types";

export async function getCurrentRole() {
  const session = await getServerSession(authOptions);
  return session?.user?.role ?? "public";
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
