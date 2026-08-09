import type { ApiResponse } from "@/domain/types";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message ?? "Erro ao consultar o servidor.");
  }

  if (payload.data === null) {
    throw new Error("Resposta vazia do servidor.");
  }

  return payload.data;
}
