"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { UserRole } from "@/domain/types";
import { authService } from "@/services/auth-service";
import { PrimaryButton } from "./PrimaryButton";

export function MockRoleGuard({
  role,
  children,
}: {
  role: Exclude<UserRole, "public">;
  children: ReactNode;
}) {
  const [currentRole, setCurrentRole] = useState<UserRole>(() =>
    typeof window === "undefined" ? "public" : authService.getCurrentRole(),
  );

  if (currentRole !== role) {
    return (
      <main className="grid min-h-screen place-items-center bg-surface px-4 py-10">
        <section className="max-w-md rounded-[28px] border border-line bg-white p-6 text-center deep-shadow">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Guard mockado</p>
          <h1 className="mt-3 font-display text-3xl font-bold text-deep">Acesso restrito</h1>
          <p className="mt-3 text-muted">
            Esta tela já passa por um guard simples. Na fase com PostgreSQL, este ponto deve validar sessão e permissões reais.
          </p>
          <PrimaryButton
            type="button"
            className="mt-6 w-full"
            onClick={() => {
              authService.setCurrentRole(role);
              setCurrentRole(role);
            }}
          >
            Entrar como {role === "admin" ? "administrador" : "associado"} mock
          </PrimaryButton>
        </section>
      </main>
    );
  }

  return children;
}
