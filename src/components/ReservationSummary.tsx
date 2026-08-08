import { CalendarDays, Clock, UsersRound, Waves } from "lucide-react";

type Props = {
  experiencia: string;
  data: string;
  horario: string;
  participantes: number;
  total: number;
};

export function ReservationSummary({ experiencia, data, horario, participantes, total }: Props) {
  return (
    <aside className="rounded-2xl border border-line bg-white p-5 deep-shadow">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted">Resumo da reserva</p>
      <h2 className="mt-2 font-display text-2xl font-bold text-deep">{experiencia}</h2>

      <dl className="mt-5 space-y-3 text-sm text-muted">
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2">
            <CalendarDays size={18} /> Data
          </dt>
          <dd className="font-semibold text-deep">{data}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2">
            <Clock size={18} /> Horario
          </dt>
          <dd className="font-semibold text-deep">{horario}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2">
            <UsersRound size={18} /> Participantes
          </dt>
          <dd className="font-semibold text-deep">{participantes}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
          <dt className="flex items-center gap-2">
            <Waves size={18} /> Total
          </dt>
          <dd className="font-display text-xl font-bold text-ocean">R$ {total}</dd>
        </div>
      </dl>
    </aside>
  );
}
