import { CalendarDays, CheckCircle2, Clock, UserRound } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "@/components/admin/ui";
import { centsToCurrency } from "@/domain/rules";
import type { AdminCustomerReservation, ReservationStatus } from "@/domain/types";
import { adminRepository } from "@/server/repositories";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function statusTone(status: ReservationStatus) {
  if (status === "confirmed") return "success";
  if (status === "waiting_payment") return "warning";
  if (status === "cancelled" || status === "no_show") return "danger";
  return "info";
}

function ReservationSummary({ reservation }: { reservation: AdminCustomerReservation }) {
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-deep">
            {reservation.date} - {reservation.time} - {reservation.experienceName}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted">
            {reservation.code} - {reservation.participantsCount} participante(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone={statusTone(reservation.status)}>{reservation.status}</StatusBadge>
          <span className="text-sm font-bold text-ocean">{centsToCurrency(reservation.totalCents)}</span>
        </div>
      </div>
    </div>
  );
}

export default async function AdminParticipantesPage() {
  const [overview, customers] = await Promise.all([
    adminRepository.overview(),
    adminRepository.customers(),
  ]);

  if (!overview.data || !customers.data) {
    return (
      <EmptyState
        title="Participantes indisponiveis"
        description={overview.error?.message ?? customers.error?.message ?? "Nao foi possivel carregar os dados administrativos."}
      />
    );
  }

  const today = todayInputValue();
  const reservationsToday = overview.data.confirmations.filter((reservation) => reservation.date === today);
  const peopleToday = reservationsToday.flatMap((reservation) =>
    reservation.participants.map((participant) => ({
      id: participant.id,
      name: participant.fullName,
      rg: participant.rg,
      phone: participant.phone ?? reservation.customer.phone,
      reservation,
    })),
  );
  const confirmedCount = reservationsToday
    .filter((reservation) => reservation.status === "confirmed")
    .reduce((total, reservation) => total + reservation.participantsCount, 0);
  const pendingCount = reservationsToday
    .filter((reservation) => reservation.status === "waiting_payment")
    .reduce((total, reservation) => total + reservation.participantsCount, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Participantes"
        title="Participantes e clientes"
        description="Lista operacional do dia e cadastro de clientes com reservas vinculadas. Planos e cotas ficam na aba Associados."
      />

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricCard icon={<CheckCircle2 size={24} />} label="Confirmados hoje" value={confirmedCount} />
        <MetricCard icon={<Clock size={24} />} label="Pendentes hoje" value={pendingCount} />
        <MetricCard icon={<UserRound size={24} />} label="Clientes cadastrados" value={customers.data.length} />
      </section>

      <section className="mt-8 rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Hoje</p>
            <h3 className="mt-1 font-display text-2xl font-bold text-deep">Participantes do dia</h3>
          </div>
          <StatusBadge tone="info">{peopleToday.length} pessoa(s)</StatusBadge>
        </div>

        <div className="mt-6 grid gap-3">
          {peopleToday.length > 0 ? (
            peopleToday.map((person) => (
              <article key={person.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-display text-lg font-bold text-deep">{person.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      RG {person.rg || "-"} - {person.reservation.experienceName} - {person.reservation.time}
                    </p>
                    <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                      Reserva {person.reservation.code}
                    </p>
                  </div>
                  <StatusBadge tone={statusTone(person.reservation.status)}>{person.reservation.status}</StatusBadge>
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="Nenhum participante hoje" description="Nao ha pessoas vinculadas a reservas na data de hoje." />
          )}
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Cadastro</p>
            <h3 className="mt-1 font-display text-2xl font-bold text-deep">Clientes cadastrados</h3>
          </div>
          <StatusBadge tone="info">{customers.data.length} registro(s)</StatusBadge>
        </div>

        <div className="mt-6 grid gap-3">
          {customers.data.length > 0 ? (
            customers.data.map((customer) => (
              <article key={customer.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-xl font-bold text-deep">{customer.name}</p>
                      <StatusBadge tone="info">{customer.totalReservations} reserva(s)</StatusBadge>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {customer.phone || "Telefone nao informado"} - {customer.email || "Email nao informado"}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      RG {customer.rg || "-"} - CPF {customer.cpf || "-"}
                    </p>
                    {customer.nextReservation ? (
                      <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-deep">
                        <CalendarDays size={16} />
                        Proxima: {customer.nextReservation.date} as {customer.nextReservation.time}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-2">
                    {customer.reservations.slice(0, 3).map((reservation) => (
                      <ReservationSummary key={reservation.id} reservation={reservation} />
                    ))}
                    {customer.reservations.length === 0 ? (
                      <EmptyState title="Sem reservas" description="Este cadastro ainda nao possui agendamentos vinculados." />
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="Nenhum associado" description="Ainda nao ha clientes com reservas cadastradas." />
          )}
        </div>
      </section>
    </div>
  );
}
