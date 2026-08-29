"use client";

import { ArrowLeft, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, CreditCard, Phone, QrCode, ShieldCheck, UserRound, WalletCards, Waves } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ReservationSummary } from "@/components/ReservationSummary";
import { Stepper } from "@/components/Stepper";
import { centsToCurrency, getExperienceBookingPolicy } from "@/domain/rules";
import type { AvailabilitySlot, Customer, Experience, Participant, PaymentMethod, ReservationQuote } from "@/domain/types";
import { experienceService } from "@/services/experience-service";
import { reservationService } from "@/services/reservation-service";

const steps = ["Passeio", "Data", "Dados", "Pagamento", "Revisao"];
const customerStorageKey = "na-kai:reservation-customer:v1";
const fortnightDays = 14;
const dateLabelFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const weekdayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short" });

const emptyCustomer: Customer = {
  fullName: "",
  rg: "",
  phone: "",
};

function getStoredCustomer() {
  if (typeof window === "undefined") return emptyCustomer;

  const savedCustomer = window.localStorage.getItem(customerStorageKey);
  if (!savedCustomer) return emptyCustomer;

  try {
    const parsed = JSON.parse(savedCustomer) as Partial<Customer>;
    return {
      ...emptyCustomer,
      fullName: parsed.fullName ?? "",
      rg: parsed.rg ?? "",
      phone: parsed.phone ?? "",
    };
  } catch {
    window.localStorage.removeItem(customerStorageKey);
    return emptyCustomer;
  }
}

function parseDateValue(value: string) {
  return new Date(`${value}T12:00:00`);
}

function toDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayDateValue() {
  return toDateValue(new Date());
}

function addDateDays(value: string, days: number) {
  const date = parseDateValue(value);
  date.setDate(date.getDate() + days);
  return toDateValue(date);
}

function formatDateLabel(value: string) {
  return dateLabelFormatter.format(parseDateValue(value)).replace(".", "");
}

function formatWeekday(value: string) {
  return weekdayFormatter.format(parseDateValue(value)).replace(".", "");
}

function formatPeriodLabel(start: string, end: string) {
  return `${formatDateLabel(start)} a ${formatDateLabel(end)}`;
}

const paymentOptions: Array<{ id: PaymentMethod; title: string; detail: string; icon: typeof QrCode }> = [
  { id: "pix", title: "Pix", detail: "Reserva registrada com pagamento Pix mockado", icon: QrCode },
  { id: "card", title: "Cartao", detail: "Preparado para gateway futuro", icon: CreditCard },
  { id: "in_person", title: "Presencial", detail: "Pagamento combinado com a equipe", icon: WalletCards },
];

export default function ReservaPage() {
  const router = useRouter();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [experienceSlug, setExperienceSlug] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dateWindowStart, setDateWindowStart] = useState(todayDateValue);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [quote, setQuote] = useState<ReservationQuote | null>(null);
  const [customer, setCustomer] = useState<Customer>(getStoredCustomer);

  useEffect(() => {
    let active = true;

    Promise.all([experienceService.list(), experienceService.availability()])
      .then(([experienceData, availabilityData]) => {
        if (!active) return;
        setExperiences(experienceData);
        setAvailability(availabilityData);
        setError(null);
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
    () => experiences.find((item) => item.slug === experienceSlug) ?? null,
    [experienceSlug, experiences],
  );

  const onlineExperiences = useMemo(
    () => experiences.filter((item) => getExperienceBookingPolicy(item).canReserveOnline),
    [experiences],
  );

  const requestOnlyExperiences = useMemo(
    () => experiences.filter((item) => !getExperienceBookingPolicy(item).canReserveOnline),
    [experiences],
  );

  const slotsForExperience = useMemo(
    () =>
      availability
        .filter((slot) => slot.experienceSlug === experienceSlug)
        .sort((first, second) => `${first.date}${first.time}`.localeCompare(`${second.date}${second.time}`)),
    [availability, experienceSlug],
  );

  const dateWindowEnd = useMemo(
    () => addDateDays(dateWindowStart, fortnightDays - 1),
    [dateWindowStart],
  );

  const windowDates = useMemo(
    () => Array.from({ length: fortnightDays }, (_, index) => addDateDays(dateWindowStart, index)),
    [dateWindowStart],
  );

  const slotsByDate = useMemo(() => {
    const groups = new Map<string, AvailabilitySlot[]>();

    for (const slot of slotsForExperience) {
      const dateSlots = groups.get(slot.date) ?? [];
      dateSlots.push(slot);
      groups.set(slot.date, dateSlots);
    }

    return groups;
  }, [slotsForExperience]);

  const slotsInWindow = useMemo(
    () => slotsForExperience.filter((slot) => slot.date >= dateWindowStart && slot.date <= dateWindowEnd),
    [dateWindowEnd, dateWindowStart, slotsForExperience],
  );

  const selectedSlot = useMemo(
    () => slotsForExperience.find((slot) => slot.date === date && slot.time === time) ?? null,
    [date, slotsForExperience, time],
  );

  useEffect(() => {
    if (!experience) return;

    let active = true;
    reservationService
      .quote({ experienceSlug: experience.slug, participantsCount: 1 })
      .then((data) => {
        if (active) setQuote(data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      });

    return () => {
      active = false;
    };
  }, [experience]);

  function selectExperience(nextExperience: Experience) {
    const firstSlot = availability
      .filter((slot) => slot.experienceSlug === nextExperience.slug)
      .sort((first, second) => `${first.date}${first.time}`.localeCompare(`${second.date}${second.time}`))[0];

    setExperienceSlug(nextExperience.slug);
    setDate("");
    setTime("");
    setQuote(null);
    setDateWindowStart(firstSlot?.date ?? todayDateValue());
    setNotice(`${nextExperience.name} selecionado.`);
  }

  function selectSlot(slot: AvailabilitySlot) {
    setDate(slot.date);
    setTime(slot.time);
    setNotice(`${slot.date} as ${slot.time} selecionado. Ainda ha ${slot.availableSpots} vaga${slot.availableSpots === 1 ? "" : "s"}.`);
  }

  function updateCustomer(field: keyof Customer, value: string) {
    const nextCustomer = { ...customer, [field]: value };
    setCustomer(nextCustomer);

    if (nextCustomer.fullName || nextCustomer.rg || nextCustomer.phone) {
      window.localStorage.setItem(
        customerStorageKey,
        JSON.stringify({
          fullName: nextCustomer.fullName,
          rg: nextCustomer.rg,
          phone: nextCustomer.phone,
        }),
      );
    }
  }

  function buildParticipants(): Participant[] {
    return [
      {
        id: "participant_1",
        fullName: customer.fullName,
        rg: customer.rg,
        phone: customer.phone,
        termsAccepted: acceptedTerms,
      },
    ];
  }

  function canAdvanceFromStep(currentStep: number) {
    if (currentStep === 0) return Boolean(experience);
    if (currentStep === 1) return Boolean(selectedSlot);
    if (currentStep === 2) return Boolean(customer.fullName.trim() && customer.rg.trim() && customer.phone.trim());
    if (currentStep === 3) return Boolean(paymentMethod);
    return Boolean(quote?.valid && acceptedTerms);
  }

  function goNext() {
    if (!canAdvanceFromStep(step)) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
  }

  async function submitReservation() {
    if (!experience || !selectedSlot || !quote?.valid || !acceptedTerms || !paymentMethod) return;

    setSubmitting(true);
    setError(null);

    try {
      const reservation = await reservationService.create({
        experienceSlug: experience.slug,
        scheduleSlotId: selectedSlot.id,
        date: selectedSlot.date,
        time: selectedSlot.time,
        participantsCount: 1,
        customer,
        participants: buildParticipants(),
        paymentMethod,
        acceptedTermsVersion: acceptedTerms ? "2026.1" : "",
      });

      window.sessionStorage.setItem("lastReservationCode", reservation.code);
      router.push("/reserva/confirmada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar a reserva.");
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

  const canContinue = canAdvanceFromStep(step);

  return (
    <main className="min-h-screen bg-surface px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="sticky top-0 z-20 -mx-4 border-b border-line bg-surface/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
           <div className="mx-auto flex max-w-6xl flex-col gap-4">

    {/* Linha principal do header */}
    <div
      className="
        relative
        grid grid-cols-[44px_1fr_auto]
        items-center gap-3

        lg:flex
        lg:items-center
        lg:justify-between
      "
    >
      <Link
        href="/"
        aria-label="Voltar para o site"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-deep"
      >
        <ArrowLeft size={15} />
      </Link>

      <h1
        className="
          col-span-2 row-start-2
          text-center
          font-display text-2xl font-bold text-deep

          sm:col-span-1
          sm:row-start-1

          lg:absolute
          lg:left-1/2
          lg:top-1/2
          lg:-translate-x-1/2
          lg:-translate-y-1/2
        "
      >
        Sua reserva
      </h1>

      <div className="flex gap-2 lg:ml-auto">
        <PrimaryButton
          type="button"
          variant="secondary"
          className="min-h-11 px-3 py-2 text-sm"
          onClick={goBack}
          disabled={step === 0 || submitting}
        >
          Voltar
        </PrimaryButton>

        {step < steps.length - 1 ? (
          <PrimaryButton
            type="button"
            className="min-h-11 px-3 py-2 text-sm"
            onClick={goNext}
            disabled={!canContinue || submitting}
          >
            Continuar
          </PrimaryButton>
        ) : (
          <PrimaryButton
            type="button"
            className="min-h-11 px-3 py-2 text-sm"
            onClick={submitReservation}
            disabled={!canContinue || submitting}
          >
            {submitting ? "Confirmando..." : "Confirmar"}
          </PrimaryButton>
        )}
      </div>
    </div>

    {/* Stepper */}
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[560px]">
        <Stepper steps={steps} current={step} />
      </div>
    </div>

  </div>
        </header>

        {error ? <StateMessage tone="error" text={error} /> : null}
        {notice ? <StateMessage text={notice} /> : null}

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-2xl border border-line bg-white p-4 deep-shadow sm:p-6">
            {step === 0 ? (
              <div>
                <StepTitle eyebrow="Etapa 1" title="Escolha o passeio" />
                <div className="mt-8 grid gap-5 2xl:grid-cols-2">
                  {onlineExperiences.map((item, index) => {
                    const active = item.slug === experienceSlug;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectExperience(item)}
                        aria-pressed={active}
                        className={`relative block w-full rounded-2xl text-left ring-offset-4 ring-offset-white transition ${
                          active ? "ring-2 ring-ocean" : "hover:-translate-y-1"
                        }`}
                      >
                        <ReservationExperienceOption experience={item} selected={active} priority={index === 0} />
                      </button>
                    );
                  })}
                </div>
                {requestOnlyExperiences.length > 0 ? (
                  <div className="mt-10">
                    <StepTitle eyebrow="Sob consulta" title="Passeios especiais" />
                    <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
                      {requestOnlyExperiences.map((item) => {
                        const bookingPolicy = getExperienceBookingPolicy(item);

                        return (
                          <article key={item.id} className="rounded-2xl border border-line bg-surface p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-display text-xl font-bold text-deep">{item.name}</p>
                                <p className="mt-2 text-sm leading-6 text-muted">{bookingPolicy.reason}</p>
                              </div>
                              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                                {bookingPolicy.publicLabel}
                              </span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 1 ? (
              <div>
                <StepTitle eyebrow="Etapa 2" title="Escolha data e horario" />
                {!experience ? <StateMessage text="Selecione um passeio para ver as datas disponiveis." /> : null}
                {experience && slotsForExperience.length === 0 ? (
                  <StateMessage text="Nenhuma data disponivel para este passeio no momento." />
                ) : null}
                {experience && slotsForExperience.length > 0 ? (
                  <>
                    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
                      <PrimaryButton
                        type="button"
                        variant="secondary"
                        className="min-h-10 px-3 py-2 text-xs"
                        onClick={() => setDateWindowStart((current) => addDateDays(current, -fortnightDays))}
                        disabled={dateWindowStart <= todayDateValue()}
                      >
                        <ChevronLeft size={16} /> Quinzena anterior
                      </PrimaryButton>
                      <p className="text-center font-display text-lg font-bold text-deep">
                        {formatPeriodLabel(dateWindowStart, dateWindowEnd)}
                      </p>
                      <PrimaryButton
                        type="button"
                        variant="secondary"
                        className="min-h-10 px-3 py-2 text-xs"
                        onClick={() => setDateWindowStart((current) => addDateDays(current, fortnightDays))}
                      >
                        Proxima quinzena <ChevronRight size={16} />
                      </PrimaryButton>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-7">
                      {windowDates.map((day) => {
                        const daySlots = slotsByDate.get(day) ?? [];
                        const availableSpots = daySlots.reduce((total, slot) => total + slot.availableSpots, 0);
                        const active = selectedSlot?.date === day;

                        return (
                          <div
                            key={day}
                            className={`min-h-24 rounded-2xl border p-3 ${
                              active ? "border-ocean bg-ocean text-white" : availableSpots > 0 ? "border-line bg-white text-deep" : "border-line bg-white/60 text-muted"
                            }`}
                          >
                            <p className="text-xs font-bold uppercase">{formatWeekday(day)}</p>
                            <p className="mt-1 font-display text-xl font-bold">{formatDateLabel(day)}</p>
                            <p className={`mt-3 text-xs font-semibold ${active ? "text-white/85" : "text-muted"}`}>
                              {availableSpots > 0 ? `${availableSpots} vaga${availableSpots === 1 ? "" : "s"}` : "Sem vagas"}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {slotsInWindow.length === 0 ? (
                      <StateMessage text="Nao ha horarios nesta quinzena. Avance para ver novas datas." />
                    ) : null}

                    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {slotsInWindow.map((slot) => {
                        const active = selectedSlot?.id === slot.id;
                        const disabled = slot.status === "full" || slot.status === "unavailable";
                        const canoeCapacityLabel = slot.canoes?.length
                          ? slot.canoes.map((canoe) => `${canoe.canoeName}: ${canoe.capacity}`).join(" | ")
                          : `Capacidade total: ${slot.capacityTotal}`;

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={disabled}
                            aria-pressed={active}
                            onClick={() => selectSlot(slot)}
                            className={`min-h-56 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              active ? "border-ocean bg-ocean text-white shadow-lg" : "border-line bg-surface text-deep hover:border-turquoise"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="flex items-center gap-2 font-display text-xl font-bold">
                                <CalendarDays size={20} /> {formatDateLabel(slot.date)}
                              </p>
                              {active ? <CheckCircle2 size={20} /> : null}
                            </div>
                            <p className="mt-3 flex items-center gap-2 text-sm">
                              <Clock size={17} /> {slot.time}
                            </p>
                            <div className={`mt-4 rounded-xl p-3 text-xs leading-5 ${active ? "bg-white/12 text-white/90" : "bg-white text-muted"}`}>
                              <p className="font-bold text-current">
                                {slot.availableSpots} de {slot.capacityTotal} vaga{slot.capacityTotal === 1 ? "" : "s"}{" "}
                                {slot.capacityTotal === 1 ? "disponivel" : "disponiveis"}
                              </p>
                              <p>{slot.occupiedSpots} ocupada{slot.occupiedSpots === 1 ? "" : "s"} no total</p>
                              <p>
                                {slot.confirmedParticipants} confirmada{slot.confirmedParticipants === 1 ? "" : "s"} + {slot.pendingParticipants} pendente
                                {slot.pendingParticipants === 1 ? "" : "s"}
                              </p>
                              <p className="mt-2 truncate">{canoeCapacityLabel}</p>
                            </div>
                            <p className={`mt-3 text-xs leading-5 ${active ? "text-white/85" : "text-muted"}`}>
                              {slot.hasMinimumParticipants
                                ? "Minimo operacional ja atingido."
                                : `Faltam ${slot.remainingToMinimum} reserva${slot.remainingToMinimum === 1 ? "" : "s"} para atingir o minimo.`}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <StepTitle eyebrow="Etapa 3" title="Dados para o termo" />
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <Field icon={<UserRound size={18} />} label="Nome completo" value={customer.fullName} onChange={(value) => updateCustomer("fullName", value)} />
                  <Field icon={<ShieldCheck size={18} />} label="RG" value={customer.rg} onChange={(value) => updateCustomer("rg", value)} />
                  <Field icon={<Phone size={18} />} label="Telefone/WhatsApp" value={customer.phone} onChange={(value) => updateCustomer("phone", value)} />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div>
                <StepTitle eyebrow="Etapa 4" title="Pagamento" />
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {paymentOptions.map((option) => {
                    const Icon = option.icon;
                    const active = paymentMethod === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(option.id);
                          setNotice(`${option.title} selecionado.`);
                        }}
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
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">Valor individual</p>
                  <p className="mt-1 font-display text-4xl font-bold text-deep">{quote ? centsToCurrency(quote.totalCents) : "Selecione o passeio"}</p>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <StepTitle eyebrow="Etapa 5" title="Revise e confirme" />
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <Info label="Passeio" value={experience?.name || "Nao selecionado"} />
                  <Info label="Data" value={selectedSlot ? `${selectedSlot.date} as ${selectedSlot.time}` : "Nao selecionada"} />
                  <Info label="Cliente" value={customer.fullName || "Nao informado"} />
                  <Info label="RG" value={customer.rg || "Nao informado"} />
                  <Info label="Telefone" value={customer.phone || "Nao informado"} />
                  <Info label="Total" value={quote ? centsToCurrency(quote.totalCents) : "Nao calculado"} />
                </div>
                <label className="mt-6 flex items-start gap-3 rounded-2xl bg-surface p-5 text-sm leading-6 text-muted">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-1 h-5 w-5 accent-[#0077be]"
                  />
                  <span>Eu li e concordo com o termo de ciencia de riscos e responsabilidade versao 2026.1.</span>
                </label>
              </div>
            ) : null}
          </section>

          <ReservationSummary
            experiencia={experience?.name ?? ""}
            data={selectedSlot?.date ?? ""}
            horario={selectedSlot?.time ?? ""}
            participantes={experience ? 1 : 0}
            totalCents={quote?.totalCents ?? 0}
            cliente={customer.fullName}
            rg={customer.rg}
            pagamento={paymentMethod || undefined}
            minimumParticipants={selectedSlot?.minimumParticipants}
            remainingToMinimum={selectedSlot?.remainingToMinimum}
          />
        </div>
      </div>
    </main>
  );
}

function StepTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-bold text-deep">{title}</h2>
    </div>
  );
}

function ReservationExperienceOption({
  experience,
  selected,
  priority,
}: {
  experience: Experience;
  selected: boolean;
  priority: boolean;
}) {
  const coverImage = experience.galleryImages[0];
  const bookingPolicy = getExperienceBookingPolicy(experience);

  return (
    <article
       className={`group grid min-h-[210px] overflow-hidden rounded-2xl border bg-white transition md:grid-cols-[220px_minmax(0,1fr)] ${
    selected
      ? "border-ocean shadow-lg shadow-[#0077be]/12"
      : "border-line hover:border-turquoise"
  }`}
    >
      <div className="relative h-52 overflow-hidden bg-deep md:h-full">
        {coverImage ? (
          <Image
            src={coverImage.src}
            alt={coverImage.alt}
            fill
            sizes="(max-width: 768px) 100vw, 220px"
            quality={86}
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-105"
            style={{ objectPosition: coverImage.objectPosition ?? "center" }}
          />
        ) : (
          <span className={`absolute inset-0 bg-cover bg-center ${experience.imageClass}`} />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-deep/74 via-deep/8 to-transparent" />
      </div>

      <div className="flex min-w-0 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl font-bold text-deep">{experience.name}</p>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{experience.shortDescription}</p>
          </div>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${selected ? "bg-success text-white" : "bg-surface text-muted"}`}>
            {selected ? <CheckCircle2 size={18} /> : <ChevronRight size={18} />}
          </span>
        </div>

        <div className="mt-auto grid gap-2 pt-4 text-xs font-bold text-deep md:grid-cols-[minmax(0,1fr)_auto]">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-surface px-3">
            <Clock size={15} /> {experience.scheduleLabel}
          </span>
          <span className="inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-xl bg-surface px-3">
            <Waves size={15} /> {centsToCurrency(experience.priceCents)}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-sand px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-deep">
            {experience.difficulty}
          </span>
          <span className="rounded-full bg-ocean/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ocean">
            {bookingPolicy.publicLabel}
          </span>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-deep">{label}</span>
      <span className="mt-2 flex h-12 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-turquoise">
        <span className="text-muted">{icon}</span>
        <input
          type="text"
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
