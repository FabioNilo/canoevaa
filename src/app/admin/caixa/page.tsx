import { Clock, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "@/components/admin/ui";
import { centsToCurrency } from "@/domain/rules";
import { adminRepository } from "@/server/repositories";

function statusTone(status: string) {
  if (status === "confirmed") return "success";
  if (status === "waiting_payment") return "warning";
  if (status === "cancelled") return "danger";
  return "info";
}

export default async function AdminCaixaPage() {
  const overview = await adminRepository.overview();

  if (!overview.data) {
    return (
      <EmptyState
        title="Caixa indisponivel"
        description={overview.error?.message ?? "Nao foi possivel carregar os dados administrativos."}
      />
    );
  }

  const confirmedReservations = overview.data.confirmations.filter((reservation) => reservation.status === "confirmed");
  const pendingReservations = overview.data.confirmations.filter((reservation) => reservation.status === "waiting_payment");
  const confirmedRevenueCents = confirmedReservations.reduce((total, reservation) => total + reservation.quote.totalCents, 0);
  const pendingRevenueCents = pendingReservations.reduce((total, reservation) => total + reservation.quote.totalCents, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Caixa"
        title="Fluxo de caixa"
        description="Receitas derivadas das reservas atuais. Lançamentos manuais entram na fase financeira."
      />

      <section className="mt-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard icon={<TrendingUp size={24} />} label="Receita confirmada" value={centsToCurrency(confirmedRevenueCents)} />
        <MetricCard icon={<Clock size={24} />} label="Receita pendente" value={centsToCurrency(pendingRevenueCents)} />
        <MetricCard icon={<TrendingDown size={24} />} label="Saidas" value={centsToCurrency(0)} />
        <MetricCard icon={<WalletCards size={24} />} label="Saldo" value={centsToCurrency(confirmedRevenueCents)} />
      </section>

      <section className="mt-8 rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Movimentaçoes</p>
          <h3 className="mt-1 font-display text-2xl font-bold text-deep">Reservas com valor financeiro</h3>
        </div>
        <div className="mt-6 grid gap-3">
          {[...confirmedReservations, ...pendingReservations].length > 0 ? (
            [...confirmedReservations, ...pendingReservations].map((reservation) => (
              <article key={reservation.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p className="font-display text-lg font-bold text-deep">{reservation.experienceName}</p>
                    <p className="mt-1 text-sm text-muted">
                      {reservation.date} - {reservation.customer.fullName} - {reservation.payment.method}
                    </p>
                  </div>
                  <p className="font-display text-lg font-bold text-ocean">{centsToCurrency(reservation.quote.totalCents)}</p>
                  <StatusBadge tone={statusTone(reservation.status)}>{reservation.status}</StatusBadge>
                </div>
              </article>
            ))
          ) : (
            <EmptyState title="Sem movimentacoes" description="Nao ha reservas confirmadas ou pendentes com valor financeiro." />
          )}
        </div>
      </section>
    </div>
  );
}
