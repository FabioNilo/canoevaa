"use client";

import { CalendarDays, CheckCircle2, ShieldCheck, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/PrimaryButton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { QuotaCard } from "@/components/QuotaCard";
import { centsToCurrency } from "@/domain/rules";
import type { MemberDashboard } from "@/domain/types";
import { memberService } from "@/services/member-service";

export default function AssociadoPage() {
  const [dashboard, setDashboard] = useState<MemberDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    memberService
      .getDashboard()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <main className="min-h-screen bg-surface px-4 py-10 text-muted">Carregando área do associado...</main>;
  }

  if (error || !dashboard) {
    return <main className="min-h-screen bg-surface px-4 py-10 text-danger">{error ?? "Dashboard indisponível."}</main>;
  }

  return (
    <main className="min-h-screen bg-surface px-4 pb-28 pt-10 sm:px-6 md:pb-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Associado</p>
            <h1 className="mt-2 font-display text-5xl font-bold text-deep">Olá, {dashboard.member.name}</h1>
            <p className="mt-3 text-xl text-muted">Pronto para a próxima aventura?</p>
          </div>
          <ButtonLink href="/associado/reservar" className="hidden md:inline-flex">
            <Waves size={18} />
            Usar cotas
          </ButtonLink>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <QuotaCard dashboard={dashboard} />

          <section className="rounded-[28px] border border-line bg-white p-6 deep-shadow">
            <div className="flex items-center justify-between gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-ocean/12 text-deep">
                <ShieldCheck size={28} />
              </span>
              <span className="rounded-full border border-turquoise/40 bg-turquoise/10 px-4 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] text-deep">
                {dashboard.member.status}
              </span>
            </div>
            <h2 className="mt-8 font-display text-3xl font-bold text-deep">{dashboard.plan.name}</h2>
            <p className="mt-3 text-lg leading-8 text-muted">
              {centsToCurrency(dashboard.plan.monthlyPriceCents)} por mês · {dashboard.plan.weeklyQuota} cotas por semana · não acumula.
            </p>

            <div className="mt-6 rounded-2xl bg-surface p-5">
              <p className="text-muted">Vencimento da fatura</p>
              <p className="mt-2 flex items-center gap-2 font-display text-3xl font-bold text-deep">
                {dashboard.member.invoiceDueDate}
                <CheckCircle2 size={22} className="text-success" />
              </p>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-deep">Próxima remada</h2>
            <ButtonLink href="/associado/reservas" variant="ghost" className="px-3">
              Ver reservas
            </ButtonLink>
          </div>

          {dashboard.nextReservation ? (
            <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-deep">{dashboard.nextReservation.experienceName}</p>
                <p className="mt-1 text-sm text-muted">
                  {dashboard.nextReservation.date} às {dashboard.nextReservation.time} · {dashboard.nextReservation.participantsCount} participantes
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-bold text-success">
                <CalendarDays size={16} />
                {dashboard.nextReservation.status}
              </span>
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-surface p-4 text-muted">Nenhuma reserva futura encontrada.</p>
          )}
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
