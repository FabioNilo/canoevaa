"use client";

import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Plus, Save, ShieldCheck, UsersRound, XCircle } from "lucide-react";
import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { centsToCurrency, getExperienceBookingPolicy } from "@/domain/rules";
import type {
  AdminOverview,
  AdminPermission,
  AdminUser,
  CreateExperienceInput,
  Experience,
  Reservation,
  ReservationStatus,
  ScheduleSlot,
  ScheduleSlotCanoeInput,
  UpdateScheduleSlotInput,
} from "@/domain/types";
import { adminService } from "@/services/admin-service";

const permissionLabels: Record<AdminPermission, string> = {
  reservations: "Reservas",
  finance: "Financeiro",
  members: "Associados",
};

const statusStyles: Record<ReservationStatus, string> = {
  waiting_payment: "bg-warning/10 text-warning",
  confirmed: "bg-success/10 text-success",
  cancellation_requested: "bg-warning/10 text-warning",
  cancelled: "bg-danger/10 text-danger",
  credit_granted: "bg-ocean/10 text-ocean",
  refunded: "bg-ocean/10 text-ocean",
  completed: "bg-success/10 text-success",
  no_show: "bg-danger/10 text-danger",
};

const scheduleStatusStyles: Record<ScheduleSlot["status"], string> = {
  available: "bg-success/10 text-success",
  low: "bg-warning/10 text-warning",
  full: "bg-danger/10 text-danger",
  unavailable: "bg-line text-muted",
  blocked: "bg-danger/10 text-danger",
  cancelled: "bg-line text-muted",
};

const canoeOptions = [
  { id: "canoe_1", name: "Canoa 1", capacity: 5 },
  { id: "canoe_2", name: "Canoa 2", capacity: 5 },
];

const defaultCanoes = canoeOptions.map((canoe) => ({ canoeId: canoe.id, capacity: canoe.capacity }));

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function csvToList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function listToCsv(value: string[]) {
  return value.join(", ");
}

function createBlankExperienceForm(): CreateExperienceInput {
  return {
    name: "",
    slug: "",
    kind: "regular",
    shortDescription: "",
    description: "",
    priceCents: 3500,
    durationMinutes: 90,
    scheduleLabel: "16:30 às 18:00",
    scheduleMode: "daily_default",
    meetingPoint: "Praia do Cristo, Ilhéus",
    difficulty: "iniciante",
    quotaCost: 1,
    imageClass: "canoe-coast",
    availableTimes: ["16:30"],
    includedItems: ["Colete", "Remo", "Instrução"],
    guidance: [],
    safetyNotes: [],
    minParticipants: 4,
    maxParticipants: 25,
    isActive: true,
  };
}

export function AdminClient({
  initialOverview,
  initialError,
}: {
  initialOverview: AdminOverview | null;
  initialError: string | null;
}) {
  const [overview, setOverview] = useState<AdminOverview | null>(initialOverview);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [experienceForm, setExperienceForm] = useState<CreateExperienceInput>(createBlankExperienceForm);
  const [generateForm, setGenerateForm] = useState({
    experienceSlug: initialOverview?.experiences.find((experience) => getExperienceBookingPolicy(experience).canGenerateDefaultSchedule)?.slug ?? "por-do-sol",
    startDate: todayInputValue(),
    daysAhead: 30,
  });
  const [scheduleForm, setScheduleForm] = useState({
    experienceSlug: initialOverview?.experiences[0]?.slug ?? "por-do-sol",
    date: todayInputValue(),
    time: "16:30",
    canoes: defaultCanoes,
    adminNotes: "",
    blockedReason: "",
  });

  const scheduleCapacityTotal = useMemo(
    () => scheduleForm.canoes.reduce((total, canoe) => total + Number(canoe.capacity || 0), 0),
    [scheduleForm.canoes],
  );

  const totals = useMemo(() => {
    if (!overview) {
      return { aguardando: 0, confirmadas: 0, usuarios: 0 };
    }

    return {
      aguardando: overview.confirmations.filter((item) => item.status === "waiting_payment").length,
      confirmadas: overview.confirmations.filter((item) => item.status === "confirmed").length,
      usuarios: overview.users.length,
    };
  }, [overview]);

  function applyExperienceToSchedule(experience: Experience) {
    const bookingPolicy = getExperienceBookingPolicy(experience);

    setScheduleForm((form) => ({
      ...form,
      experienceSlug: experience.slug,
      time: experience.availableTimes[0] ?? form.time,
      canoes: defaultCanoes,
    }));

    if (bookingPolicy.canGenerateDefaultSchedule) {
      setGenerateForm((form) => ({ ...form, experienceSlug: experience.slug }));
    }
  }

  function updateFormCanoe(index: number, changes: Partial<ScheduleSlotCanoeInput>) {
    setScheduleForm((form) => ({
      ...form,
      canoes: form.canoes.map((canoe, canoeIndex) => (canoeIndex === index ? { ...canoe, ...changes } : canoe)),
    }));
  }

  async function createExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!overview) return;

    setSavingId("experience_new");
    setError(null);

    try {
      const created = await adminService.createExperience(experienceForm);
      setOverview({ ...overview, experiences: [...overview.experiences, created] });
      setExperienceForm(createBlankExperienceForm());
      setScheduleForm((form) => ({
        ...form,
        experienceSlug: created.slug,
        time: created.availableTimes[0] ?? form.time,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o passeio.");
    } finally {
      setSavingId(null);
    }
  }

  async function saveExperience(experience: Experience, input: Partial<CreateExperienceInput>) {
    if (!overview) return;

    setSavingId(experience.id);
    setError(null);

    try {
      const updated = await adminService.updateExperience(experience.id, input);
      setOverview({
        ...overview,
        experiences: overview.experiences.map((item) => (item.id === updated.id ? updated : item)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o passeio.");
    } finally {
      setSavingId(null);
    }
  }

  async function generateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!overview) return;

    setSavingId("schedule_generate");
    setError(null);

    try {
      const result = await adminService.generateSchedule({
        ...generateForm,
        canoes: defaultCanoes,
      });
      setOverview({
        ...overview,
        schedule: [...result.slots, ...overview.schedule].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar a agenda.");
    } finally {
      setSavingId(null);
    }
  }

  async function setConfirmationStatus(id: string, status: ReservationStatus) {
    if (!overview) return;

    setSavingId(id);
    setError(null);

    try {
      const updated = await adminService.updateReservationStatus(id, status);
      setOverview({
        ...overview,
        confirmations: overview.confirmations.map((item) => (item.id === updated.id ? updated : item)),
        pendingPayments: overview.confirmations.filter((item) =>
          item.id === updated.id ? updated.status === "waiting_payment" : item.status === "waiting_payment",
        ).length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a reserva.");
    } finally {
      setSavingId(null);
    }
  }

  async function togglePermission(user: AdminUser, permission: AdminPermission) {
    if (!overview) return;

    setSavingId(user.id);
    setError(null);

    try {
      const updated = await adminService.updateUserPermissions(user.id, {
        [permission]: !user.permissions[permission],
      });
      setOverview({
        ...overview,
        users: overview.users.map((item) => (item.id === updated.id ? updated : item)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar permissões.");
    } finally {
      setSavingId(null);
    }
  }

  async function createScheduleSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!overview) return;

    setSavingId("schedule_new");
    setError(null);

    try {
      const created = await adminService.createScheduleSlot({
        ...scheduleForm,
        capacityTotal: scheduleCapacityTotal,
      });
      setOverview({ ...overview, schedule: [created, ...overview.schedule] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o horário.");
    } finally {
      setSavingId(null);
    }
  }

  async function blockScheduleSlot(slot: ScheduleSlot) {
    if (!overview) return;

    setSavingId(slot.id);
    setError(null);

    try {
      const updated = await adminService.updateScheduleSlot(slot.id, {
        status: slot.status === "blocked" ? "open" : "blocked",
      });
      setOverview({
        ...overview,
        schedule: overview.schedule.map((item) => (item.id === updated.id ? updated : item)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar o horário.");
    } finally {
      setSavingId(null);
    }
  }

  async function saveScheduleSlot(slot: ScheduleSlot, input: UpdateScheduleSlotInput) {
    if (!overview) return;

    setSavingId(slot.id);
    setError(null);

    try {
      const updated = await adminService.updateScheduleSlot(slot.id, input);
      setOverview({
        ...overview,
        schedule: overview.schedule.map((item) => (item.id === updated.id ? updated : item)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o horário.");
    } finally {
      setSavingId(null);
    }
  }

  if (error && !overview) {
    return <section className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-danger">{error}</section>;
  }

  if (!overview) {
    return <section className="rounded-2xl border border-line bg-white p-4 text-muted">Nenhum dado administrativo encontrado.</section>;
  }

  return (
    <div>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-ocean">
              <ArrowLeft size={18} />
              Voltar ao site
            </Link>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Administração</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-deep">Reservas e agenda</h1>
          </div>
          <span className="w-fit rounded-full bg-deep px-4 py-2 text-sm font-bold text-white">Backend-ready</span>
        </header>

        {error ? <p className="mt-5 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-danger">{error}</p> : null}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Metric icon={<Clock size={24} />} label="Aguardando" value={totals.aguardando} />
          <Metric icon={<CheckCircle2 size={24} />} label="Confirmadas" value={totals.confirmadas} />
          <Metric icon={<UsersRound size={24} />} label="Usuários admin" value={totals.usuarios} />
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-3">
          <Metric icon={<UsersRound size={24} />} label="Participantes hoje" value={overview.participantsToday} />
          <Metric icon={<ShieldCheck size={24} />} label="Vagas hoje" value={overview.availableSpotsToday} />
          <article className="rounded-2xl border border-line bg-white p-5 deep-shadow">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">Receita confirmada</p>
            <p className="mt-3 font-display text-3xl font-bold text-deep">{centsToCurrency(overview.confirmedRevenueCents)}</p>
          </article>
        </section>

        <section className="mt-8 rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Passeios</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-deep">Cadastro e agenda padrao</h2>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">
              {overview.experiences.length} cadastrados
            </span>
          </div>

          <form className="mt-5 grid gap-3 md:grid-cols-4" onSubmit={createExperience}>
            <Input
              label="Nome"
              value={experienceForm.name}
              onChange={(value) => setExperienceForm((form) => ({ ...form, name: value }))}
            />
            <Input
              label="Slug"
              value={experienceForm.slug}
              onChange={(value) => setExperienceForm((form) => ({ ...form, slug: value }))}
            />
            <Select
              label="Tipo"
              value={experienceForm.kind}
              options={[
                { value: "regular", label: "Regular" },
                { value: "celebration", label: "Comemoracao" },
                { value: "expedition", label: "Expedicao" },
              ]}
              onChange={(value) =>
                setExperienceForm((form) => ({
                  ...form,
                  kind: value as CreateExperienceInput["kind"],
                  scheduleMode: value === "regular" ? form.scheduleMode : "manual",
                  minParticipants: value === "celebration" ? 6 : form.minParticipants,
                }))
              }
            />
            <Select
              label="Agenda"
              value={experienceForm.kind === "regular" ? experienceForm.scheduleMode : "manual"}
              options={
                experienceForm.kind === "regular"
                  ? [
                      { value: "daily_default", label: "Todos os dias" },
                      { value: "manual", label: "Datas especificas" },
                    ]
                  : [{ value: "manual", label: "Datas especificas / sob consulta" }]
              }
              onChange={(value) =>
                setExperienceForm((form) => ({ ...form, scheduleMode: value as CreateExperienceInput["scheduleMode"] }))
              }
            />
            <Input
              label="Resumo"
              value={experienceForm.shortDescription}
              onChange={(value) => setExperienceForm((form) => ({ ...form, shortDescription: value }))}
            />
            <Input
              label="Descricao"
              value={experienceForm.description}
              onChange={(value) => setExperienceForm((form) => ({ ...form, description: value }))}
            />
            <Input
              label="Preco em centavos"
              type="number"
              value={String(experienceForm.priceCents)}
              onChange={(value) => setExperienceForm((form) => ({ ...form, priceCents: Number(value) }))}
            />
            <Input
              label="Duracao em minutos"
              type="number"
              value={String(experienceForm.durationMinutes)}
              onChange={(value) => setExperienceForm((form) => ({ ...form, durationMinutes: Number(value) }))}
            />
            <Input
              label="Rotulo de horario"
              value={experienceForm.scheduleLabel}
              onChange={(value) => setExperienceForm((form) => ({ ...form, scheduleLabel: value }))}
            />
            <Input
              label="Horarios sugeridos"
              value={listToCsv(experienceForm.availableTimes)}
              onChange={(value) => setExperienceForm((form) => ({ ...form, availableTimes: csvToList(value) }))}
            />
            <Input
              label="Minimo"
              type="number"
              value={String(experienceForm.minParticipants)}
              onChange={(value) => setExperienceForm((form) => ({ ...form, minParticipants: Number(value) }))}
            />
            <Input
              label="Maximo"
              type="number"
              value={String(experienceForm.maxParticipants)}
              onChange={(value) => setExperienceForm((form) => ({ ...form, maxParticipants: Number(value) }))}
            />
            <Input
              label="Ponto de encontro"
              value={experienceForm.meetingPoint}
              onChange={(value) => setExperienceForm((form) => ({ ...form, meetingPoint: value }))}
            />
            <Select
              label="Dificuldade"
              value={experienceForm.difficulty}
              options={[
                { value: "iniciante", label: "Iniciante" },
                { value: "intermediario", label: "Intermediario" },
                { value: "avancado", label: "Avancado" },
              ]}
              onChange={(value) =>
                setExperienceForm((form) => ({ ...form, difficulty: value as CreateExperienceInput["difficulty"] }))
              }
            />
            <Input
              label="Cotas"
              type="number"
              value={String(experienceForm.quotaCost)}
              onChange={(value) => setExperienceForm((form) => ({ ...form, quotaCost: Number(value) }))}
            />
            <Input
              label="Classe visual"
              value={experienceForm.imageClass}
              onChange={(value) => setExperienceForm((form) => ({ ...form, imageClass: value }))}
            />
            <PrimaryButton className="md:col-span-4" type="submit" disabled={savingId === "experience_new"}>
              <Plus size={16} />
              Criar passeio
            </PrimaryButton>
          </form>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            {overview.experiences.map((experience) => (
              <ExperienceAdminCard
                key={experience.id}
                experience={experience}
                saving={savingId === experience.id}
                onApplySchedule={() => applyExperienceToSchedule(experience)}
                onSave={(input) => saveExperience(experience, input)}
              />
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Reservas</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-deep">Confirmações de remada</h2>
              </div>
              <ShieldCheck className="text-turquoise" size={28} />
            </div>

            <div className="mt-6 space-y-4">
              {overview.confirmations.length > 0 ? (
                overview.confirmations.map((item) => (
                  <ReservationAdminCard
                    key={item.id}
                    reservation={item}
                    saving={savingId === item.id}
                    onConfirm={() => setConfirmationStatus(item.id, "confirmed")}
                    onReject={() => setConfirmationStatus(item.id, "cancelled")}
                  />
                ))
              ) : (
                <p className="rounded-2xl border border-line bg-surface p-4 text-muted">Nenhuma reserva encontrada.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Agenda</p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-deep">Horários e vagas</h2>
                </div>
                <CalendarDays className="text-turquoise" size={28} />
              </div>

              <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={generateSchedule}>
                <Select
                  label="Passeio diario"
                  value={generateForm.experienceSlug}
                  options={overview.experiences
                    .filter((experience) => getExperienceBookingPolicy(experience).canGenerateDefaultSchedule)
                    .map((experience) => ({ value: experience.slug, label: experience.name }))}
                  onChange={(value) => setGenerateForm((form) => ({ ...form, experienceSlug: value }))}
                />
                <Input
                  label="Data inicial"
                  type="date"
                  value={generateForm.startDate}
                  onChange={(value) => setGenerateForm((form) => ({ ...form, startDate: value }))}
                />
                <Input
                  label="Dias futuros"
                  type="number"
                  value={String(generateForm.daysAhead)}
                  onChange={(value) => setGenerateForm((form) => ({ ...form, daysAhead: Number(value) }))}
                />
                <PrimaryButton className="sm:col-span-2" type="submit" disabled={savingId === "schedule_generate"}>
                  <CalendarDays size={16} />
                  Gerar datas futuras
                </PrimaryButton>
              </form>

              <form className="mt-6 grid gap-3 sm:grid-cols-2" onSubmit={createScheduleSlot}>
                <Select
                  label="Passeio para data especifica"
                  value={scheduleForm.experienceSlug}
                  options={overview.experiences.map((experience) => ({ value: experience.slug, label: experience.name }))}
                  onChange={(value) => {
                    const nextExperience = overview.experiences.find((experience) => experience.slug === value);
                    setScheduleForm((form) => ({
                      ...form,
                      experienceSlug: value,
                      time: nextExperience?.availableTimes[0] ?? form.time,
                    }));
                  }}
                />
                <Input
                  label="Data"
                  type="date"
                  value={scheduleForm.date}
                  onChange={(value) => setScheduleForm((form) => ({ ...form, date: value }))}
                />
                <Input
                  label="Hora"
                  type="time"
                  value={scheduleForm.time}
                  onChange={(value) => setScheduleForm((form) => ({ ...form, time: value }))}
                />
                {scheduleForm.canoes.map((canoe, index) => (
                  <div key={index} className="rounded-xl border border-line bg-surface p-3">
                    <label className="block">
                      <span className="text-xs font-bold text-deep">Canoa {index + 1}</span>
                      <select
                        value={canoe.canoeId}
                        onChange={(event) => updateFormCanoe(index, { canoeId: event.target.value })}
                        className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-turquoise"
                      >
                        {canoeOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Input
                      label="Vagas nesta canoa"
                      type="number"
                      value={String(canoe.capacity)}
                      onChange={(value) => updateFormCanoe(index, { capacity: Number(value) })}
                    />
                  </div>
                ))}
                <Input
                  label="Observações internas"
                  value={scheduleForm.adminNotes}
                  onChange={(value) => setScheduleForm((form) => ({ ...form, adminNotes: value }))}
                />
                <Input
                  label="Motivo de bloqueio"
                  value={scheduleForm.blockedReason}
                  onChange={(value) => setScheduleForm((form) => ({ ...form, blockedReason: value }))}
                />
                <p className="rounded-xl bg-ocean/10 px-4 py-3 text-sm font-bold text-ocean sm:col-span-2">
                  Capacidade calculada: {scheduleCapacityTotal} vagas em {scheduleForm.canoes.length} canoa(s).
                </p>
                <PrimaryButton className="sm:col-span-2" type="submit" disabled={savingId === "schedule_new"}>
                  Criar horário
                </PrimaryButton>
              </form>

              <div className="mt-6 space-y-3">
                {overview.schedule.map((slot) => (
                  <ScheduleAdminCard
                    key={slot.id}
                    slot={slot}
                    saving={savingId === slot.id}
                    onToggleBlock={() => blockScheduleSlot(slot)}
                    onSave={(input) => saveScheduleSlot(slot, input)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Equipe</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-deep">Permissões</h2>

              <div className="mt-6 space-y-4">
                {overview.users.map((user) => (
                  <article key={user.id} className="rounded-2xl border border-line p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold text-deep">{user.name}</h3>
                        <p className="mt-1 text-sm capitalize text-muted">{user.role}</p>
                      </div>
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-turquoise/14 text-deep">
                        <UsersRound size={20} />
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2">
                      {(Object.keys(user.permissions) as AdminPermission[]).map((permission) => {
                        const active = user.permissions[permission];

                        return (
                          <button
                            key={permission}
                            type="button"
                            disabled={savingId === user.id}
                            onClick={() => togglePermission(user, permission)}
                            className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-left disabled:opacity-60"
                          >
                            <span className="text-sm font-bold text-deep">{permissionLabels[permission]}</span>
                            <span className={`grid h-7 w-7 place-items-center rounded-full ${active ? "bg-success text-white" : "bg-line text-muted"}`}>
                              {active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ReservationAdminCard({
  reservation,
  saving,
  onConfirm,
  onReject,
}: {
  reservation: Reservation;
  saving: boolean;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">{reservation.code}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[reservation.status]}`}>
              {reservation.status}
            </span>
          </div>
          <h3 className="mt-3 font-display text-xl font-bold text-deep">{reservation.customer.fullName}</h3>
          <p className="mt-1 text-sm text-muted">
            {reservation.experienceName} · {reservation.date} às {reservation.time} · {reservation.payment.method}
          </p>
          <p className="mt-2 text-sm font-semibold text-deep">{reservation.participantsCount} participantes</p>
        </div>

        <div className="flex gap-2">
          <PrimaryButton type="button" className="min-h-10 px-3 py-2 text-xs" disabled={saving} onClick={onConfirm}>
            Confirmar
          </PrimaryButton>
          <PrimaryButton type="button" variant="secondary" className="min-h-10 px-3 py-2 text-xs" disabled={saving} onClick={onReject}>
            Cancelar
          </PrimaryButton>
        </div>
      </div>
    </article>
  );
}

function ExperienceAdminCard({
  experience,
  saving,
  onApplySchedule,
  onSave,
}: {
  experience: Experience;
  saving: boolean;
  onApplySchedule: () => void;
  onSave: (input: Partial<CreateExperienceInput>) => void;
}) {
  const [draft, setDraft] = useState({
    name: experience.name,
    priceCents: experience.priceCents,
    scheduleLabel: experience.scheduleLabel,
    scheduleMode: experience.scheduleMode,
    availableTimes: listToCsv(experience.availableTimes),
    minParticipants: experience.minParticipants,
    maxParticipants: experience.maxParticipants,
    isActive: experience.isActive ? "active" : "inactive",
  });
  const bookingPolicy = getExperienceBookingPolicy(experience);
  const scheduleModeOptions =
    experience.kind === "regular"
      ? [
          { value: "daily_default", label: "Todos os dias" },
          { value: "manual", label: "Datas especificas" },
        ]
      : [{ value: "manual", label: "Datas especificas / sob consulta" }];

  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-muted">{experience.kind}</span>
            <span className="rounded-full bg-ocean/10 px-3 py-1 text-xs font-bold text-ocean">
              {experience.scheduleMode === "manual" ? "datas especificas" : "todos os dias"}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-muted">{bookingPolicy.adminLabel}</span>
          </div>
          <h3 className="mt-3 font-display text-xl font-bold text-deep">{experience.name}</h3>
          <p className="mt-1 text-sm text-muted">{experience.slug}</p>
          {bookingPolicy.reason ? <p className="mt-2 text-sm text-muted">{bookingPolicy.reason}</p> : null}
        </div>
        <PrimaryButton type="button" variant="secondary" className="min-h-10 px-3 py-2 text-xs" onClick={onApplySchedule}>
          Usar na agenda
        </PrimaryButton>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          label="Nome"
          value={draft.name}
          onChange={(value) => setDraft((current) => ({ ...current, name: value }))}
        />
        <Input
          label="Preco em centavos"
          type="number"
          value={String(draft.priceCents)}
          onChange={(value) => setDraft((current) => ({ ...current, priceCents: Number(value) }))}
        />
        <Input
          label="Rotulo de horario"
          value={draft.scheduleLabel}
          onChange={(value) => setDraft((current) => ({ ...current, scheduleLabel: value }))}
        />
        <Input
          label="Horarios sugeridos"
          value={draft.availableTimes}
          onChange={(value) => setDraft((current) => ({ ...current, availableTimes: value }))}
        />
        <Select
          label="Agenda"
          value={experience.kind === "regular" ? draft.scheduleMode : "manual"}
          options={scheduleModeOptions}
          onChange={(value) =>
            setDraft((current) => ({ ...current, scheduleMode: value as Experience["scheduleMode"] }))
          }
        />
        <Select
          label="Status"
          value={draft.isActive}
          options={[
            { value: "active", label: "Ativo" },
            { value: "inactive", label: "Inativo" },
          ]}
          onChange={(value) => setDraft((current) => ({ ...current, isActive: value }))}
        />
        <Input
          label="Minimo"
          type="number"
          value={String(draft.minParticipants)}
          onChange={(value) => setDraft((current) => ({ ...current, minParticipants: Number(value) }))}
        />
        <Input
          label="Maximo"
          type="number"
          value={String(draft.maxParticipants)}
          onChange={(value) => setDraft((current) => ({ ...current, maxParticipants: Number(value) }))}
        />
        <PrimaryButton
          type="button"
          className="sm:col-span-2"
          disabled={saving}
          onClick={() =>
            onSave({
              name: draft.name,
              priceCents: draft.priceCents,
              scheduleLabel: draft.scheduleLabel,
              scheduleMode: experience.kind === "regular" ? draft.scheduleMode : "manual",
              availableTimes: csvToList(draft.availableTimes),
              minParticipants: draft.minParticipants,
              maxParticipants: draft.maxParticipants,
              isActive: draft.isActive === "active",
            })
          }
        >
          <Save size={16} />
          Salvar passeio
        </PrimaryButton>
      </div>
    </article>
  );
}

function ScheduleAdminCard({
  slot,
  saving,
  onToggleBlock,
  onSave,
}: {
  slot: ScheduleSlot;
  saving: boolean;
  onToggleBlock: () => void;
  onSave: (input: UpdateScheduleSlotInput) => void;
}) {
  const [draft, setDraft] = useState({
    date: slot.date,
    time: slot.time,
    capacityTotal: slot.capacityTotal,
    adminNotes: slot.adminNotes ?? "",
    blockedReason: slot.blockedReason ?? "",
  });

  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${scheduleStatusStyles[slot.status]}`}>
              {slot.status}
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">
              {slot.availableSpots}/{slot.capacityTotal} vagas
            </span>
          </div>
          <h3 className="mt-2 font-display text-lg font-bold text-deep">{slot.experienceName}</h3>
          <p className="mt-1 text-sm text-muted">
            {slot.date} às {slot.time}
          </p>
        </div>
        <PrimaryButton type="button" variant="secondary" className="min-h-10 px-3 py-2 text-xs" disabled={saving} onClick={onToggleBlock}>
          {slot.status === "blocked" ? "Reabrir" : "Bloquear"}
        </PrimaryButton>
      </div>
      {slot.canoes && slot.canoes.length > 0 ? (
        <p className="mt-3 text-xs font-semibold text-muted">
          {slot.canoes.map((canoe) => `${canoe.canoeName}: ${canoe.capacity}`).join(" · ")}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          label="Nova data"
          type="date"
          value={draft.date}
          onChange={(value) => setDraft((current) => ({ ...current, date: value }))}
        />
        <Input
          label="Novo horário"
          type="time"
          value={draft.time}
          onChange={(value) => setDraft((current) => ({ ...current, time: value }))}
        />
        <Input
          label="Capacidade total"
          type="number"
          value={String(draft.capacityTotal)}
          onChange={(value) => setDraft((current) => ({ ...current, capacityTotal: Number(value) }))}
        />
        <Input
          label="Motivo de bloqueio"
          value={draft.blockedReason}
          onChange={(value) => setDraft((current) => ({ ...current, blockedReason: value }))}
        />
        <div className="sm:col-span-2">
          <Input
            label="Observações internas"
            value={draft.adminNotes}
            onChange={(value) => setDraft((current) => ({ ...current, adminNotes: value }))}
          />
        </div>
        <PrimaryButton
          type="button"
          className="sm:col-span-2"
          disabled={saving}
          onClick={() =>
            onSave({
              date: draft.date,
              time: draft.time,
              capacityTotal: draft.capacityTotal,
              adminNotes: draft.adminNotes,
              blockedReason: draft.blockedReason,
            })
          }
        >
          <Save size={16} />
          Salvar ajustes
        </PrimaryButton>
      </div>
    </article>
  );
}

function Input({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-deep">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-turquoise"
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-deep">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-turquoise"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-5 deep-shadow">
      <div className="flex items-center justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-turquoise/14 text-deep">{icon}</span>
        <p className="font-display text-4xl font-bold text-deep">{value}</p>
      </div>
      <p className="mt-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
    </article>
  );
}
