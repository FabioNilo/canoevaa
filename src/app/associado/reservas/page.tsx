"use client";

import { CalendarDays, Clock, Plus, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/PrimaryButton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MockRoleGuard } from "@/components/MockRoleGuard";
import type { MemberDashboard, Reservation } from "@/domain/types";
import { memberService } from "@/services/member-service";

export default function ReservasPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [dashboard, setDashboard] = useState<MemberDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([memberService.getReservations(), memberService.getDashboard()])
      .then(([reservationData, dashboardData]) => {
        if (!active) return;
        setReservations(reservationData);
        setDashboard(dashboardData);
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
    return <main className="min-h-screen bg-surface px-4 py-10 text-muted">Carregando reservas...</main>;
  }

  if (error) {
    return <main className="min-h-screen bg-surface px-4 py-10 text-danger">{error}</main>;
  }

  return (
    <MockRoleGuard role="member">
      <main className="min-h-screen bg-surface px-4 pb-28 pt-10 sm:px-6 md:pb-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Área do associado</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-deep">Minhas reservas</h1>
          </div>
          <ButtonLink href="/reserva" className="w-full sm:w-auto">
            <Plus size={18} />
            Nova reserva
          </ButtonLink>
        </div>

        <section className="mt-8 rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">Saldo atual</p>
              <p className="mt-1 font-display text-3xl font-bold text-deep">
                {dashboard?.quotasAvailable ?? 0} cotas disponíveis
              </p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-turquoise/16 text-deep">
              <Waves size={24} />
            </span>
          </div>
        </section>

        {reservations.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-line bg-white p-5 text-muted">Nenhuma reserva encontrada.</p>
        ) : (
          <section className="mt-6 space-y-4">
            {reservations.map((reservation) => (
              <article key={reservation.id} className="rounded-2xl border border-line bg-white p-5 deep-shadow">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-ocean">
                      {reservation.code}
                    </span>
                    <h2 className="mt-2 font-display text-2xl font-bold text-deep">{reservation.experienceName}</h2>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={17} /> {reservation.date}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Clock size={17} /> {reservation.time}
                      </span>
                    </div>
                  </div>
                  <span className="w-fit rounded-full bg-deep px-3 py-1 text-sm font-bold text-white">
                    {reservation.status}
                  </span>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
      <MobileBottomNav />
      </main>
    </MockRoleGuard>
  );
}
