import { CalendarDays, CheckCircle2, ShieldCheck, Waves } from "lucide-react";
import { ButtonLink } from "@/components/PrimaryButton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { QuotaCard } from "@/components/QuotaCard";
import { associado } from "@/data/associado";
import { reservas } from "@/data/reservas";

export default function AssociadoPage() {
  const proximaReserva = reservas.find((reserva) => reserva.status === "confirmada");

  return (
    <main className="min-h-screen bg-surface px-4 pb-28 pt-10 sm:px-6 md:pb-12 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Associado</p>
            <h1 className="mt-2 font-display text-5xl font-bold text-deep">Ola, {associado.nome}</h1>
            <p className="mt-3 text-xl text-muted">Pronto para a proxima aventura?</p>
          </div>
          <ButtonLink href="/reserva" className="hidden md:inline-flex">
            <Waves size={18} />
            Usar cotas
          </ButtonLink>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <QuotaCard member={associado} />

          <section className="rounded-[28px] border border-line bg-white p-6 deep-shadow">
            <div className="flex items-center justify-between gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-ocean/12 text-deep">
                <ShieldCheck size={28} />
              </span>
              <span className="rounded-full border border-turquoise/40 bg-turquoise/10 px-4 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] text-deep">
                Plano ativo
              </span>
            </div>
            <h2 className="mt-8 font-display text-3xl font-bold text-deep">{associado.plano}</h2>
            <p className="mt-3 text-lg leading-8 text-muted">Acesso completo as remadas semanais e eventos especiais.</p>

            <div className="mt-6 rounded-2xl bg-surface p-5">
              <p className="text-muted">Vencimento da fatura</p>
              <p className="mt-2 flex items-center gap-2 font-display text-3xl font-bold text-deep">
                {associado.vencimento}
                <CheckCircle2 size={22} className="text-success" />
              </p>
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-deep">Proxima remada</h2>
            <ButtonLink href="/associado/reservas" variant="ghost" className="px-3">
              Ver reservas
            </ButtonLink>
          </div>

          {proximaReserva ? (
            <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-deep">{proximaReserva.experiencia}</p>
                <p className="mt-1 text-sm text-muted">
                  {proximaReserva.data} as {proximaReserva.horario} · {proximaReserva.participantes} participante
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-bold text-success">
                <CalendarDays size={16} />
                Confirmada
              </span>
            </div>
          ) : null}
        </section>
      </div>
      <MobileBottomNav />
    </main>
  );
}
