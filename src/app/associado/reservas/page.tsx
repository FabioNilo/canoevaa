import { CalendarDays, Clock, Plus, Waves } from "lucide-react";
import { ButtonLink } from "@/components/PrimaryButton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { associado } from "@/data/associado";
import { reservas } from "@/data/reservas";

const statusLabel = {
  confirmada: "Confirmada",
  concluida: "Concluida",
  cancelada: "Cancelada",
};

export default function ReservasPage() {
  return (
    <main className="min-h-screen bg-surface px-4 pb-28 pt-10 sm:px-6 md:pb-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Area do associado</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-deep">Minhas Reservas</h1>
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
                {associado.cotasDisponiveis} cotas disponiveis
              </p>
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-full bg-turquoise/16 text-deep">
              <Waves size={24} />
            </span>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {reservas.map((reserva) => (
            <article key={reserva.codigo} className="rounded-2xl border border-line bg-white p-5 deep-shadow">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-ocean">
                    {reserva.codigo}
                  </span>
                  <h2 className="mt-2 font-display text-2xl font-bold text-deep">{reserva.experiencia}</h2>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={17} /> {reserva.data}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Clock size={17} /> {reserva.horario}
                    </span>
                  </div>
                </div>
                <span className="w-fit rounded-full bg-deep px-3 py-1 text-sm font-bold text-white">
                  {statusLabel[reserva.status]}
                </span>
              </div>
            </article>
          ))}
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
