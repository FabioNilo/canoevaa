"use client";

import { ArrowLeft, CalendarDays, Check, Minus, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { ExperienceCard } from "@/components/ExperienceCard";
import { ButtonLink, PrimaryButton } from "@/components/PrimaryButton";
import { ReservationSummary } from "@/components/ReservationSummary";
import { Stepper } from "@/components/Stepper";
import { experiencias } from "@/data/experiencias";
import { useMemo, useState } from "react";

const datas = ["10/08/2026", "11/08/2026", "12/08/2026", "14/08/2026", "15/08/2026"];
const steps = ["Experiencia", "Data", "Pessoas", "Revisao"];

export default function ReservaPage() {
  const [step, setStep] = useState(0);
  const [experienceSlug, setExperienceSlug] = useState("por-do-sol");
  const [data, setData] = useState(datas[2]);
  const [horario, setHorario] = useState("16:30");
  const [participantes, setParticipantes] = useState(1);

  const experience = useMemo(
    () => experiencias.find((item) => item.slug === experienceSlug) ?? experiencias[0],
    [experienceSlug],
  );
  const total = experience.preco * participantes;

  function goNext() {
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Voltar" className="grid h-11 w-11 place-items-center rounded-full bg-white text-deep">
            <ArrowLeft size={21} />
          </Link>
          <h1 className="font-display text-2xl font-bold text-deep">Sua Reserva</h1>
          <div className="h-11 w-11" />
        </header>

        <div className="mt-6">
          <Stepper steps={steps} current={step} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
            {step === 0 ? (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Etapa 1</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-deep">Escolha sua experiencia</h2>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {experiencias.map((item) => {
                    const active = item.slug === experienceSlug;

                    return (
                      <button
                        key={item.slug}
                        type="button"
                        onClick={() => {
                          setExperienceSlug(item.slug);
                          setHorario(item.horarios[0]);
                        }}
                        className={`rounded-[20px] text-left ring-offset-4 transition ${
                          active ? "ring-2 ring-turquoise" : "hover:-translate-y-1"
                        }`}
                      >
                        <ExperienceCard experience={item} linked={false} selected={active} />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Etapa 2</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-deep">Escolha data e horario</h2>

                <div className="mt-6">
                  <h3 className="flex items-center gap-2 font-display text-lg font-bold text-deep">
                    <CalendarDays size={20} /> Datas disponiveis
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    {datas.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setData(item)}
                        className={`h-14 rounded-xl border text-sm font-bold transition ${
                          data === item ? "border-ocean bg-ocean text-white" : "border-line bg-surface text-deep"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="font-display text-lg font-bold text-deep">Horario da remada</h3>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {experience.horarios.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setHorario(item)}
                        className={`h-12 rounded-xl border text-sm font-bold transition ${
                          horario === item ? "border-turquoise bg-turquoise/16 text-deep" : "border-line bg-white text-muted"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Etapa 3</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-deep">Participantes</h2>
                <p className="mt-3 text-muted">Inclua voce e convidados. Esta versao ainda nao salva dados reais.</p>

                <div className="mt-8 flex items-center justify-between rounded-2xl bg-surface p-5">
                  <div>
                    <p className="flex items-center gap-2 font-display text-xl font-bold text-deep">
                      <UsersRound size={22} /> Pessoas na canoa
                    </p>
                    <p className="mt-1 text-sm text-muted">Maximo de 6 participantes</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setParticipantes((value) => Math.max(1, value - 1))}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white text-deep"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="w-8 text-center font-display text-3xl font-bold text-deep">{participantes}</span>
                    <button
                      type="button"
                      onClick={() => setParticipantes((value) => Math.min(6, value + 1))}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white text-deep"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Etapa 4</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-deep">Confirme sua reserva</h2>
                <div className="mt-6 rounded-2xl bg-surface p-5">
                  <label className="flex items-start gap-3 text-sm leading-6 text-muted">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-turquoise text-deep">
                      <Check size={16} />
                    </span>
                    Eu li e concordo com os termos de responsabilidade e regras de seguranca da ILHÉUS CANOE VA&apos;A.
                  </label>
                </div>
              </div>
            ) : null}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <PrimaryButton type="button" variant="secondary" onClick={goBack} disabled={step === 0}>
                Voltar
              </PrimaryButton>
              {step < steps.length - 1 ? (
                <PrimaryButton type="button" onClick={goNext}>
                  Continuar
                </PrimaryButton>
              ) : (
                <ButtonLink href="/reserva/confirmada">Confirmar reserva</ButtonLink>
              )}
            </div>
          </section>

          <ReservationSummary
            experiencia={experience.nome}
            data={data}
            horario={horario}
            participantes={participantes}
            total={total}
          />
        </div>
      </div>
    </main>
  );
}
