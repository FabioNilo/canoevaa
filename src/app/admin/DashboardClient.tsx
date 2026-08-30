"use client";

import { CalendarDays, CheckCircle2, Clock, RefreshCw, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "@/components/admin/ui";
import { centsToCurrency } from "@/domain/rules";
import type { AdminDashboardMode, AdminDashboardOverview, Reservation, ScheduleSlot } from "@/domain/types";
import { adminService } from "@/services/admin-service";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

function formatDateLabel(value: string) {
  return dateFormatter.format(new Date(`${value}T12:00:00`)).replace(".", "");
}

function statusTone(status: Reservation["status"]) {
  if (status === "confirmed") return "success";
  if (status === "waiting_payment" || status === "cancellation_requested") return "warning";
  if (status === "cancelled" || status === "no_show") return "danger";
  return "info";
}

function scheduleTone(status: ScheduleSlot["status"]) {
  if (status === "available") return "success";
  if (status === "low") return "warning";
  if (status === "full" || status === "blocked") return "danger";
  return "neutral";
}

export function AdminDashboardClient({ initialDashboard }: { initialDashboard: AdminDashboardOverview }) {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [mode, setMode] = useState<AdminDashboardMode>(initialDashboard.mode);
  const [selectedDate, setSelectedDate] = useState(initialDashboard.startDate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const selectedDay = dashboard.days[0] ?? null;
  const pendingReservations = useMemo(
    () => selectedDay?.reservations.filter((reservation) => reservation.status === "waiting_payment") ?? [],
    [selectedDay],
  );
  const maxWeekParticipants = Math.max(1, ...dashboard.days.map((day) => day.confirmedParticipants));

  async function loadDashboard(nextMode: AdminDashboardMode, nextDate: string) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setMode(nextMode);
    setSelectedDate(nextDate);
    setLoading(true);
    setError(null);

    try {
      const nextDashboard = await adminService.getDashboard({ mode: nextMode, startDate: nextDate });
      if (requestIdRef.current === requestId) {
        setDashboard(nextDashboard);
      }
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar o dashboard.");
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="Operação diaria"
        description="Acompanhe remadas, pendências, vagas e receita calculadas pelo período selecionado."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="inline-flex rounded-2xl border border-line bg-white p-1">
              <button
                type="button"
                onClick={() => loadDashboard("today", selectedDate)}
                className={`min-h-10 rounded-xl px-4 text-sm font-bold ${mode === "today" ? "bg-ocean text-white" : "text-muted hover:bg-surface"}`}
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => loadDashboard("week", selectedDate)}
                className={`min-h-10 rounded-xl px-4 text-sm font-bold ${mode === "week" ? "bg-ocean text-white" : "text-muted hover:bg-surface"}`}
              >
                Semana
              </button>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => loadDashboard(mode, event.target.value)}
              className="h-12 rounded-2xl border border-line bg-white px-4 text-sm font-bold text-deep outline-none focus:border-turquoise"
            />
          </div>
        }
      />

      {error ? <p className="mt-5 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error}</p> : null}
      {loading ? (
        <p className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-bold text-muted">
          <RefreshCw className="animate-spin" size={16} />
          Atualizando período
        </p>
      ) : null}

      {mode === "today" ? (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Clock size={24} />} label="Aguardando confirmacao" value={dashboard.metrics.pendingReservations} />
            <MetricCard icon={<UsersRound size={24} />} label="Participantes confirmados" value={dashboard.metrics.confirmedParticipants} />
            <MetricCard icon={<ShieldCheck size={24} />} label="Vagas disponíveis" value={dashboard.metrics.availableSpots} />
            <MetricCard icon={<WalletCards size={24} />} label="Receita do dia" value={centsToCurrency(dashboard.metrics.confirmedRevenueCents)} />
          </section>

          <section className="mt-8 rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Remadas</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-deep">
                  {selectedDay ? formatDateLabel(selectedDay.date) : "Período vazio"}
                </h3>
              </div>
              <StatusBadge tone="info">{selectedDay?.slots.length ?? 0} horario(s)</StatusBadge>
            </div>

            <div className="mt-6 grid gap-3">
              {selectedDay && selectedDay.slots.length > 0 ? (
                selectedDay.slots.map((slot) => (
                  <article key={slot.id} className="rounded-2xl border border-line bg-surface p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="flex items-center gap-2 font-display text-xl font-bold text-deep">
                          <CalendarDays size={20} /> {slot.time} - {slot.experienceName}
                        </p>
                        <p className="mt-2 text-sm text-muted">
                          {slot.confirmedParticipants} confirmado(s), {slot.pendingParticipants} pendente(s) - {slot.availableSpots} vaga(s)
                        </p>
                      </div>
                      <StatusBadge tone={scheduleTone(slot.status)}>{slot.status}</StatusBadge>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState title="Nenhuma remada no período" description="A agenda ainda não possui horários para a data selecionada." />
              )}
            </div>
          </section>

          <section className="mt-8 rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Pendências</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-deep">Reservas aguardando confirmação</h3>
              </div>
              <CheckCircle2 className="text-turquoise" size={28} />
            </div>
            <div className="mt-6 grid gap-3">
              {pendingReservations.length > 0 ? (
                pendingReservations.map((reservation) => (
                  <article key={reservation.id} className="rounded-2xl border border-line bg-surface p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-display text-lg font-bold text-deep">{reservation.customer.fullName}</p>
                        <p className="mt-1 text-sm text-muted">
                          {reservation.experienceName} - {reservation.time} - {reservation.code}
                        </p>
                      </div>
                      <StatusBadge tone={statusTone(reservation.status)}>{reservation.status}</StatusBadge>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState title="Sem pendências para esta data" description="Não há reservas aguardando confirmação no período selecionado." />
              )}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<UsersRound size={24} />} label="Participantes na semana" value={dashboard.metrics.confirmedParticipants} />
            <MetricCard icon={<ShieldCheck size={24} />} label="Vagas na semana" value={dashboard.metrics.availableSpots} />
            <MetricCard icon={<CalendarDays size={24} />} label="Reservas ativas" value={dashboard.metrics.activeReservations} />
            <MetricCard icon={<WalletCards size={24} />} label="Receita confirmada" value={centsToCurrency(dashboard.metrics.confirmedRevenueCents)} />
          </section>

          <section className="mt-8 rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Proximos 7 dias</p>
              <h3 className="mt-1 font-display text-2xl font-bold text-deep">
                {formatDateLabel(dashboard.startDate)} a {formatDateLabel(dashboard.endDate)}
              </h3>
            </div>
            <div className="mt-6 grid gap-3">
              {dashboard.days.map((day) => (
                <article key={day.date} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="grid gap-4 md:grid-cols-[1.15fr_1fr_1fr_1fr] md:items-center">
                    <div>
                      <p className="font-display text-lg font-bold text-deep">{formatDateLabel(day.date)}</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <span
                          className="block h-full rounded-full bg-ocean"
                          style={{ width: `${Math.round((day.confirmedParticipants / maxWeekParticipants) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-deep">{day.confirmedParticipants} participante(s)</p>
                    <p className="text-sm font-semibold text-deep">{day.availableSpots} vaga(s)</p>
                    <p className="font-display text-lg font-bold text-ocean">{centsToCurrency(day.confirmedRevenueCents)}</p>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-muted">
                    {day.slots.length} horário(s) - {day.activeReservations} reserva(s) ativa(s)
                  </p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
