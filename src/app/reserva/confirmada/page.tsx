"use client";

import { CalendarDays, CheckCircle2, Clock, MapPin, Share2 } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/PrimaryButton";

export default function ReservaConfirmadaPage() {
  const [code] = useState(() =>
    typeof window === "undefined" ? "ICV-3108" : window.sessionStorage.getItem("lastReservationCode") ?? "ICV-3108",
  );

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <section className="w-full max-w-2xl rounded-[28px] border border-line bg-white p-6 text-center deep-shadow sm:p-8">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/10 text-success">
          <CheckCircle2 size={42} />
        </span>
        <h1 className="mt-6 font-display text-4xl font-bold text-deep">Reserva recebida!</h1>
        <p className="mt-3 text-muted">A reserva foi criada na API mockada e está pronta para receber persistência real.</p>

        <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-surface p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">Código da reserva</p>
          <p className="mt-1 font-display text-3xl font-bold text-deep">{code}</p>
        </div>

        <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
          {[
            { icon: CalendarDays, label: "Origem", value: "API interna mockada" },
            { icon: Clock, label: "Pagamento", value: "Aguardando confirmação" },
            { icon: MapPin, label: "Encontro", value: "Definido pela experiência" },
            { icon: Share2, label: "Status", value: "Aguardando pagamento" },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="rounded-2xl border border-line p-4">
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Icon size={18} /> {item.label}
                </p>
                <p className="mt-1 font-bold text-deep">{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/associado/reservas">Ver minhas reservas</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Voltar ao início
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
