import { CalendarDays, Clock, CreditCard, IdCard, Mail, UsersRound, Waves } from "lucide-react";
import { centsToCurrency } from "@/domain/rules";

type Props = {
  experiencia: string;
  data: string;
  horario: string;
  participantes: number;
  totalCents: number;
  cliente?: string;
  rg?: string;
  pagamento?: string;
  minimumParticipants?: number;
  remainingToMinimum?: number;
};

const emptyValue = "-";

export function ReservationSummary({
  experiencia,
  data,
  horario,
  participantes,
  totalCents,
  cliente,
  rg,
  pagamento,
  minimumParticipants,
  remainingToMinimum,
}: Props) {
  const hasMinimumFeedback = typeof minimumParticipants === "number" && typeof remainingToMinimum === "number";

  return (
    <aside className="rounded-2xl border border-line bg-white p-5 deep-shadow">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted">Resumo da reserva</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-deep">{experiencia || "Reserva vazia"}</h2>

      <dl className="mt-5 space-y-3 text-sm text-muted">
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2">
            <CalendarDays size={18} /> Data
          </dt>
          <dd className="font-semibold text-deep">{data || emptyValue}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2">
            <Clock size={18} /> Horario
          </dt>
          <dd className="font-semibold text-deep">{horario || emptyValue}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2">
            <UsersRound size={18} /> Vagas
          </dt>
          <dd className="font-semibold text-deep">{participantes ? participantes : emptyValue}</dd>
        </div>
        {cliente ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2">
              <Mail size={18} /> Cliente
            </dt>
            <dd className="max-w-36 truncate text-right font-semibold text-deep">{cliente}</dd>
          </div>
        ) : null}
        {rg ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2">
              <IdCard size={18} /> RG
            </dt>
            <dd className="max-w-36 truncate text-right font-semibold text-deep">{rg}</dd>
          </div>
        ) : null}
        {pagamento ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2">
              <CreditCard size={18} /> Pagamento
            </dt>
            <dd className="font-semibold text-deep">{pagamento}</dd>
          </div>
        ) : null}
        {hasMinimumFeedback ? (
          <div className="rounded-xl border border-line bg-sand/50 p-3 text-xs font-semibold text-deep">
            {remainingToMinimum > 0
              ? `Faltam ${remainingToMinimum} reserva${remainingToMinimum === 1 ? "" : "s"} para o minimo de ${minimumParticipants}.`
              : `Minimo operacional de ${minimumParticipants} ja atingido.`}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
          <dt className="flex items-center gap-2">
            <Waves size={18} /> Total
          </dt>
          <dd className="font-display text-xl font-bold text-ocean">{centsToCurrency(totalCents)}</dd>
        </div>
      </dl>
    </aside>
  );
}
