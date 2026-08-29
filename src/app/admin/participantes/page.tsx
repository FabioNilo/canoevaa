import { CheckCircle2, Clock, UserRound } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "@/components/admin/ui";
import { adminRepository } from "@/server/repositories";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function statusTone(status: string) {
  if (status === "confirmed") return "success";
  if (status === "waiting_payment") return "warning";
  if (status === "cancelled") return "danger";
  return "info";
}

export default async function AdminParticipantesPage() {
  const overview = await adminRepository.overview();

  if (!overview.data) {
    return (
      <EmptyState
        title="Participantes indisponiveis"
        description={overview.error?.message ?? "Nao foi possivel carregar os dados administrativos."}
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
        title="Participantes do dia"
        description="Lista operacional de pessoas vinculadas as reservas de hoje."
      />

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <MetricCard icon={<CheckCircle2 size={24} />} label="Confirmados" value={confirmedCount} />
        <MetricCard icon={<Clock size={24} />} label="Pendentes" value={pendingCount} />
        <MetricCard icon={<UserRound size={24} />} label="Pessoas listadas" value={peopleToday.length} />
      </section>

      <section className="mt-8 rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
        <div className="grid gap-3">
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
                      Reserva avulsa
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
    </div>
  );
}
