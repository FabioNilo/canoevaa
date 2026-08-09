"use client";

import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  Home,
  Mail,
  Minus,
  Phone,
  Plus,
  QrCode,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ExperienceCard } from "@/components/ExperienceCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ReservationSummary } from "@/components/ReservationSummary";
import { Stepper } from "@/components/Stepper";
import { RESERVATION_RULES, centsToCurrency, getMinimumParticipants } from "@/domain/rules";
import type { AvailabilitySlot, Customer, Experience, Participant, PaymentMethod, ReservationQuote } from "@/domain/types";
import { experienceService } from "@/services/experience-service";
import { reservationService } from "@/services/reservation-service";

const steps = ["Experiência", "Data", "Cliente", "Pessoas", "Pagamento", "Revisão"];
const paymentOptions: Array<{ id: PaymentMethod; title: string; detail: string; icon: typeof QrCode }> = [
  { id: "pix", title: "Pix", detail: "Pronto para QR Code e cópia e cola no backend real", icon: QrCode },
  { id: "card", title: "Cartão", detail: "Preparado para gateway futuro", icon: CreditCard },
  { id: "in_person", title: "Presencial", detail: "Registro manual pela equipe", icon: WalletCards },
];

export default function ReservaPage() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [experienceSlug, setExperienceSlug] = useState("por-do-sol");
  const [date, setDate] = useState("2026-08-12");
  const [time, setTime] = useState("16:30");
  const [participantsCount, setParticipantsCount] = useState(4);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [quote, setQuote] = useState<ReservationQuote | null>(null);
  const [customer, setCustomer] = useState<Customer>({
    fullName: "Fabio Almeida",
    cpf: "000.000.000-00",
    birthDate: "1990-05-20",
    phone: "(73) 99999-0000",
    email: "fabio@email.com",
    address: "Rua da Praia, 120 - Ilhéus, BA",
    willParticipate: true,
  });

  useEffect(() => {
    let active = true;

    Promise.all([experienceService.list(), experienceService.availability()])
      .then(([experienceData, availabilityData]) => {
        if (!active) return;
        setExperiences(experienceData);
        setAvailability(availabilityData);
        setError(null);

        const initialExperience = experienceData.find((item) => item.slug === "por-do-sol") ?? experienceData[0];
        const initialSlot = availabilityData.find((slot) => slot.experienceSlug === initialExperience?.slug);

        if (initialExperience) {
          setExperienceSlug(initialExperience.slug);
          setParticipantsCount(getMinimumParticipants(initialExperience));
        }

        if (initialSlot) {
          setDate(initialSlot.date);
          setTime(initialSlot.time);
        }
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const experience = useMemo(
    () => experiences.find((item) => item.slug === experienceSlug) ?? experiences[0],
    [experienceSlug, experiences],
  );

  const slotsForExperience = useMemo(
    () => availability.filter((slot) => slot.experienceSlug === experienceSlug),
    [availability, experienceSlug],
  );

  useEffect(() => {
    if (!experience) return;

    let active = true;
    reservationService
      .quote({ experienceSlug: experience.slug, participantsCount })
      .then((data) => {
        if (active) setQuote(data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, [experience, participantsCount]);

  function goNext() {
    if (quote && !quote.valid && step >= 3) {
      return;
    }

    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  function updateCustomer(field: keyof Customer, value: string | boolean) {
    setCustomer((current) => ({ ...current, [field]: value }));
  }

  function selectExperience(nextExperience: Experience) {
    const firstSlot = availability.find((slot) => slot.experienceSlug === nextExperience.slug && slot.status !== "full");
    setExperienceSlug(nextExperience.slug);
    setParticipantsCount(getMinimumParticipants(nextExperience));

    if (firstSlot) {
      setDate(firstSlot.date);
      setTime(firstSlot.time);
    } else {
      setTime(nextExperience.availableTimes[0] ?? "");
    }
  }

  function buildParticipants(): Participant[] {
    return Array.from({ length: participantsCount }).map((_, index) => ({
      id: `participant_${index + 1}`,
      fullName: index === 0 && customer.willParticipate ? customer.fullName : `Participante ${index + 1}`,
      cpf: index === 0 && customer.willParticipate ? customer.cpf : "000.000.000-00",
      birthDate: index === 0 && customer.willParticipate ? customer.birthDate : "1995-01-01",
      phone: index === 0 && customer.willParticipate ? customer.phone : customer.phone,
      emergencyContactName: "Contato de emergência",
      emergencyContactPhone: customer.phone,
      termsAccepted: acceptedTerms,
    }));
  }

  async function submitReservation() {
    if (!experience || !quote?.valid || !acceptedTerms) return;

    setSubmitting(true);
    setError(null);

    try {
      const reservation = await reservationService.create({
        experienceSlug: experience.slug,
        date,
        time,
        participantsCount,
        customer,
        participants: buildParticipants(),
        paymentMethod,
        acceptedTermsVersion: acceptedTerms ? "2026.1" : "",
      });

      window.sessionStorage.setItem("lastReservationCode", reservation.code);
      router.push("/reserva/confirmada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a reserva.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-surface px-4 py-10 text-muted">Carregando dados da reserva...</main>;
  }

  if (error && experiences.length === 0) {
    return <main className="min-h-screen bg-surface px-4 py-10 text-danger">{error}</main>;
  }

  if (!experience) {
    return <main className="min-h-screen bg-surface px-4 py-10 text-muted">Nenhuma experiência ativa encontrada.</main>;
  }

  const minParticipants = getMinimumParticipants(experience);
  const canContinue = step < 3 || !quote || quote.valid;

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

        <div className="mt-6 overflow-x-auto pb-2">
          <div className="min-w-[620px]">
            <Stepper steps={steps} current={step} />
          </div>
        </div>

        {error ? <StateMessage tone="error" text={error} /> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
            {step === 0 ? (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Etapa 1</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-deep">Escolha sua experiência</h2>
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {experiences.map((item) => {
                    const active = item.slug === experienceSlug;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectExperience(item)}
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
                <h2 className="mt-2 font-display text-3xl font-bold text-deep">Escolha data e horário</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {slotsForExperience.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={slot.status === "full" || slot.status === "unavailable"}
                      onClick={() => {
                        setDate(slot.date);
                        setTime(slot.time);
                      }}
                      className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        date === slot.date && time === slot.time ? "border-ocean bg-ocean text-white" : "border-line bg-surface text-deep"
                      }`}
                    >
                      <p className="flex items-center gap-2 font-display text-lg font-bold">
                        <CalendarDays size={19} /> {slot.date}
                      </p>
                      <p className="mt-2 text-sm">Horário: {slot.time}</p>
                      <p className="mt-1 text-sm">Vagas: {slot.availableSpots}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.12em]">{slot.status}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Etapa 3</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-deep">Dados do responsável</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field icon={<UserRound size={18} />} label="Nome completo" value={customer.fullName} onChange={(value) => updateCustomer("fullName", value)} />
                  <Field icon={<UserRound size={18} />} label="CPF" value={customer.cpf} onChange={(value) => updateCustomer("cpf", value)} />
                  <Field icon={<CalendarDays size={18} />} label="Nascimento" type="date" value={customer.birthDate} onChange={(value) => updateCustomer("birthDate", value)} />
                  <Field icon={<Phone size={18} />} label="Telefone/WhatsApp" value={customer.phone} onChange={(value) => updateCustomer("phone", value)} />
                  <Field icon={<Mail size={18} />} label="E-mail" type="email" value={customer.email} onChange={(value) => updateCustomer("email", value)} />
                  <Field icon={<Home size={18} />} label="Endereço" value={customer.address} onChange={(value) => updateCustomer("address", value)} />
                </div>
                <label className="mt-5 flex items-center gap-3 rounded-2xl bg-surface p-4 text-sm font-bold text-deep">
                  <input
                    type="checkbox"
                    checked={customer.willParticipate}
                    onChange={(event) => updateCustomer("willParticipate", event.target.checked)}
                    className="h-5 w-5 accent-[#0077be]"
                  />
                  Também participarei da atividade.
                </label>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Etapa 4</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-deep">Participantes</h2>
                <p className="mt-3 text-muted">
                  Regra atual: mínimo {minParticipants}, máximo {experience.maxParticipants}. O cadastro detalhado já sai no payload mockado.
                </p>

                <div className="mt-8 flex flex-col gap-5 rounded-2xl bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 font-display text-xl font-bold text-deep">
                      <UsersRound size={22} /> Pessoas na canoa
                    </p>
                    <p className="mt-1 text-sm text-muted">Capacidade operacional máxima: {RESERVATION_RULES.generalMaxParticipants}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setParticipantsCount((value) => Math.max(1, value - 1))}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white text-deep"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="w-10 text-center font-display text-3xl font-bold text-deep">{participantsCount}</span>
                    <button
                      type="button"
                      onClick={() => setParticipantsCount((value) => Math.min(RESERVATION_RULES.generalMaxParticipants, value + 1))}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white text-deep"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                {quote?.errors.map((quoteError) => (
                  <StateMessage key={quoteError.code} tone="error" text={quoteError.message} />
                ))}
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Etapa 5</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-deep">Pagamento</h2>
                <p className="mt-3 text-muted">Interface preparada para gateway, mas ainda mockada.</p>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {paymentOptions.map((option) => {
                    const Icon = option.icon;
                    const active = paymentMethod === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPaymentMethod(option.id)}
                        className={`rounded-2xl border p-5 text-left transition ${
                          active ? "border-ocean bg-ocean text-white" : "border-line bg-surface text-deep hover:border-turquoise"
                        }`}
                      >
                        <Icon size={26} />
                        <p className="mt-4 font-display text-xl font-bold">{option.title}</p>
                        <p className={`mt-2 text-sm leading-6 ${active ? "text-white/84" : "text-muted"}`}>{option.detail}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-2xl bg-surface p-5">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">Valor a pagar</p>
                  <p className="mt-1 font-display text-4xl font-bold text-deep">{quote ? centsToCurrency(quote.totalCents) : "Calculando..."}</p>
                </div>
              </div>
            ) : null}

            {step === 5 ? (
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Etapa 6</p>
                <h2 className="mt-2 font-display text-3xl font-bold text-deep">Revise e confirme</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Info label="Cliente" value={customer.fullName} />
                  <Info label="CPF" value={customer.cpf} />
                  <Info label="E-mail" value={customer.email} />
                  <Info label="Total" value={quote ? centsToCurrency(quote.totalCents) : "Calculando"} />
                </div>
                <label className="mt-6 flex items-start gap-3 rounded-2xl bg-surface p-5 text-sm leading-6 text-muted">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-1 h-5 w-5 accent-[#0077be]"
                  />
                  <span>Eu li e concordo com o termo de ciência de riscos e responsabilidade versão 2026.1.</span>
                </label>
              </div>
            ) : null}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <PrimaryButton type="button" variant="secondary" onClick={goBack} disabled={step === 0 || submitting}>
                Voltar
              </PrimaryButton>
              {step < steps.length - 1 ? (
                <PrimaryButton type="button" onClick={goNext} disabled={!canContinue || submitting}>
                  Continuar
                </PrimaryButton>
              ) : (
                <PrimaryButton type="button" onClick={submitReservation} disabled={!quote?.valid || !acceptedTerms || submitting}>
                  {submitting ? "Confirmando..." : "Confirmar reserva"}
                </PrimaryButton>
              )}
            </div>
          </section>

          <ReservationSummary
            experiencia={experience.name}
            data={date}
            horario={time}
            participantes={participantsCount}
            totalCents={quote?.totalCents ?? 0}
            cliente={customer.fullName}
            pagamento={paymentMethod}
          />
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  icon,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-deep">{label}</span>
      <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-turquoise">
        <span className="text-muted">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-sm outline-none"
        />
      </span>
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 break-words font-semibold text-deep">{value}</p>
    </div>
  );
}

function StateMessage({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "error" }) {
  return (
    <div className={`mt-5 rounded-2xl border p-4 text-sm ${tone === "error" ? "border-danger/30 bg-danger/10 text-danger" : "border-line bg-white text-muted"}`}>
      {text}
    </div>
  );
}
