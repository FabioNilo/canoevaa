"use client";

import { CalendarDays, Copy, Pencil, Plus, Power, Save, Trash2, XCircle } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin/ui";
import { PrimaryButton } from "@/components/PrimaryButton";
import { centsToCurrency, getExperienceBookingPolicy } from "@/domain/rules";
import type {
  Canoe,
  CreateCanoeInput,
  CreateExperienceInput,
  CreateScheduleSlotInput,
  Experience,
  ScheduleSlot,
  ScheduleSlotCanoeInput,
  UpdateCanoeInput,
} from "@/domain/types";
import { adminService } from "@/services/admin-service";

type TabId = "experiences" | "canoes" | "schedule";
type ScheduleForm = Omit<CreateScheduleSlotInput, "capacityTotal" | "canoes"> & {
  capacityTotal: number;
  canoes: ScheduleSlotCanoeInput[];
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "experiences", label: "Passeios" },
  { id: "canoes", label: "Canoas" },
  { id: "schedule", label: "Agenda" },
];

function csvToList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function listToCsv(value: string[]) {
  return value.join(", ");
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function sortSchedule(slots: ScheduleSlot[]) {
  return [...slots].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

function scheduleTone(status: ScheduleSlot["status"]) {
  if (status === "available") return "success";
  if (status === "low") return "warning";
  if (status === "full" || status === "blocked") return "danger";
  return "neutral";
}

function createBlankScheduleForm(experiences: Experience[], canoes: Canoe[]): ScheduleForm {
  const experience = experiences[0];
  const selectedCanoes = canoes
    .filter((canoe) => canoe.isActive)
    .slice(0, 2)
    .map((canoe) => ({ canoeId: canoe.id, capacity: canoe.capacity }));
  const capacityTotal = selectedCanoes.reduce((total, canoe) => total + canoe.capacity, 0) || experience?.maxParticipants || 10;

  return {
    experienceSlug: experience?.slug ?? "",
    date: todayInputValue(),
    time: experience?.availableTimes[0] ?? "16:30",
    capacityTotal,
    canoes: [
      selectedCanoes[0] ?? { canoeId: "", capacity: capacityTotal },
      selectedCanoes[1] ?? { canoeId: "", capacity: 0 },
    ],
    adminNotes: "",
  };
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
    scheduleLabel: "16:30 as 18:00",
    scheduleMode: "daily_default",
    meetingPoint: "Praia do Cristo, Ilheus",
    difficulty: "iniciante",
    quotaCost: 1,
    imageClass: "canoe-coast",
    availableTimes: ["16:30"],
    includedItems: ["Colete", "Remo", "Instrucao"],
    guidance: [],
    safetyNotes: [],
    minParticipants: 4,
    maxParticipants: 25,
    isActive: true,
  };
}

function experienceToForm(experience: Experience): CreateExperienceInput {
  return {
    name: experience.name,
    slug: experience.slug,
    kind: experience.kind,
    shortDescription: experience.shortDescription,
    description: experience.description,
    priceCents: experience.priceCents,
    durationMinutes: experience.durationMinutes,
    scheduleLabel: experience.scheduleLabel,
    scheduleMode: experience.scheduleMode,
    meetingPoint: experience.meetingPoint,
    difficulty: experience.difficulty,
    quotaCost: experience.quotaCost,
    imageClass: experience.imageClass,
    availableTimes: experience.availableTimes,
    includedItems: experience.includedItems,
    guidance: experience.guidance,
    safetyNotes: experience.safetyNotes,
    minParticipants: experience.minParticipants,
    maxParticipants: experience.maxParticipants,
    isActive: experience.isActive,
  };
}

function makeDuplicateSlug(slug: string, experiences: Experience[]) {
  const usedSlugs = new Set(experiences.map((experience) => experience.slug));
  let nextSlug = `${slug}-copia`;
  let index = 2;

  while (usedSlugs.has(nextSlug)) {
    nextSlug = `${slug}-copia-${index}`;
    index += 1;
  }

  return nextSlug;
}

export function PasseiosClient({
  initialExperiences,
  initialCanoes,
  initialSchedule,
}: {
  initialExperiences: Experience[];
  initialCanoes: Canoe[];
  initialSchedule: ScheduleSlot[];
}) {
  const [activeTab, setActiveTab] = useState<TabId>("experiences");
  const [experiences, setExperiences] = useState(initialExperiences);
  const [canoes, setCanoes] = useState(initialCanoes);
  const [schedule, setSchedule] = useState(() => sortSchedule(initialSchedule));
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(() => createBlankScheduleForm(initialExperiences, initialCanoes));
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [experienceForm, setExperienceForm] = useState<CreateExperienceInput>(createBlankExperienceForm);
  const [canoeForm, setCanoeForm] = useState<CreateCanoeInput>({ name: "", capacity: 5, isActive: true });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const editingExperience = useMemo(
    () => experiences.find((experience) => experience.id === editingExperienceId) ?? null,
    [editingExperienceId, experiences],
  );

  const activeCanoes = canoes.filter((canoe) => canoe.isActive);
  const currentScheduleExperience = experiences.find((experience) => experience.slug === scheduleForm.experienceSlug) ?? experiences[0] ?? null;
  const selectedScheduleCanoes = scheduleForm.canoes.filter((canoe) => canoe.canoeId && canoe.capacity > 0);
  const scheduleCapacityTotal = selectedScheduleCanoes.length > 0
    ? selectedScheduleCanoes.reduce((total, canoe) => total + canoe.capacity, 0)
    : scheduleForm.capacityTotal;

  function beginCreateExperience() {
    setEditingExperienceId("new");
    setExperienceForm(createBlankExperienceForm());
    setError(null);
  }

  function beginEditExperience(experience: Experience) {
    setEditingExperienceId(experience.id);
    setExperienceForm(experienceToForm(experience));
    setError(null);
  }

  async function submitExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingId(editingExperienceId ?? "experience");
    setError(null);
    setNotice(null);

    try {
      if (editingExperienceId === "new" || !editingExperience) {
        const created = await adminService.createExperience(experienceForm);
        setExperiences((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        setEditingExperienceId(null);
        setNotice("Passeio criado.");
        return;
      }

      const updated = await adminService.updateExperience(editingExperience.id, experienceForm);
      setExperiences((current) => current.map((experience) => (experience.id === updated.id ? updated : experience)));
      setEditingExperienceId(null);
      setNotice("Passeio atualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o passeio.");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleExperience(experience: Experience) {
    setSavingId(experience.id);
    setError(null);
    setNotice(null);

    try {
      const updated = await adminService.updateExperience(experience.id, { isActive: !experience.isActive });
      setExperiences((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(updated.isActive ? "Passeio ativado." : "Passeio desativado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel alterar o passeio.");
    } finally {
      setSavingId(null);
    }
  }

  async function duplicateExperience(experience: Experience) {
    setSavingId(`duplicate_${experience.id}`);
    setError(null);
    setNotice(null);

    try {
      const created = await adminService.createExperience({
        ...experienceToForm(experience),
        name: `${experience.name} copia`,
        slug: makeDuplicateSlug(experience.slug, experiences),
        isActive: false,
      });
      setExperiences((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNotice("Passeio duplicado como inativo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel duplicar o passeio.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteExperience(experience: Experience) {
    const confirmed = window.confirm(`Excluir ${experience.name}? Passeios com agenda ou reservas devem ser desativados.`);
    if (!confirmed) return;

    setSavingId(`delete_${experience.id}`);
    setError(null);
    setNotice(null);

    try {
      await adminService.deleteExperience(experience.id);
      setExperiences((current) => current.filter((item) => item.id !== experience.id));
      setNotice("Passeio excluido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel excluir o passeio.");
    } finally {
      setSavingId(null);
    }
  }

  async function createCanoe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingId("canoe_new");
    setError(null);
    setNotice(null);

    try {
      const created = await adminService.createCanoe(canoeForm);
      setCanoes((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCanoeForm({ name: "", capacity: 5, isActive: true });
      setNotice("Canoa criada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar a canoa.");
    } finally {
      setSavingId(null);
    }
  }

  async function saveCanoe(id: string, input: UpdateCanoeInput) {
    setSavingId(id);
    setError(null);
    setNotice(null);

    try {
      const updated = await adminService.updateCanoe(id, input);
      setCanoes((current) => current.map((canoe) => (canoe.id === updated.id ? updated : canoe)));
      setNotice("Canoa atualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar a canoa.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteCanoe(canoe: Canoe) {
    const confirmed = window.confirm(`Excluir ${canoe.name}? Canoas vinculadas a agenda devem ser desativadas.`);
    if (!confirmed) return;

    setSavingId(`delete_${canoe.id}`);
    setError(null);
    setNotice(null);

    try {
      await adminService.deleteCanoe(canoe.id);
      setCanoes((current) => current.filter((item) => item.id !== canoe.id));
      setNotice("Canoa excluida.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel excluir a canoa.");
    } finally {
      setSavingId(null);
    }
  }

  function updateScheduleExperience(slug: string) {
    const experience = experiences.find((item) => item.slug === slug);
    setScheduleForm((form) => ({
      ...form,
      experienceSlug: slug,
      time: experience?.availableTimes[0] ?? form.time,
    }));
  }

  function updateScheduleCanoe(index: number, canoeId: string) {
    const canoe = activeCanoes.find((item) => item.id === canoeId);
    setScheduleForm((form) => ({
      ...form,
      canoes: form.canoes.map((item, itemIndex) =>
        itemIndex === index ? { canoeId, capacity: canoe?.capacity ?? item.capacity } : item,
      ),
    }));
  }

  function updateScheduleCanoeCapacity(index: number, capacity: number) {
    setScheduleForm((form) => ({
      ...form,
      canoes: form.canoes.map((item, itemIndex) => (itemIndex === index ? { ...item, capacity } : item)),
    }));
  }

  async function createScheduleSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingId("schedule_new");
    setError(null);
    setNotice(null);

    try {
      const created = await adminService.createScheduleSlot({
        ...scheduleForm,
        capacityTotal: scheduleCapacityTotal,
        canoes: selectedScheduleCanoes.length > 0 ? selectedScheduleCanoes : undefined,
      });
      setSchedule((current) => sortSchedule([...current, created]));
      setScheduleForm((form) => ({ ...form, adminNotes: "" }));
      setNotice("Horario criado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar o horario.");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleScheduleSlot(slot: ScheduleSlot) {
    setSavingId(slot.id);
    setError(null);
    setNotice(null);

    try {
      const updated = await adminService.updateScheduleSlot(slot.id, {
        status: slot.status === "blocked" ? "open" : "blocked",
      });
      setSchedule((current) => sortSchedule(current.map((item) => (item.id === updated.id ? updated : item))));
      setNotice(updated.status === "blocked" ? "Horario bloqueado." : "Horario liberado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel alterar o horario.");
    } finally {
      setSavingId(null);
    }
  }

  async function cancelScheduleSlot(slot: ScheduleSlot) {
    const confirmed = window.confirm(`Cancelar ${slot.date} ${slot.time}? Reservas existentes permanecem no historico.`);
    if (!confirmed) return;

    setSavingId(`cancel_${slot.id}`);
    setError(null);
    setNotice(null);

    try {
      const updated = await adminService.updateScheduleSlot(slot.id, { status: "cancelled" });
      setSchedule((current) => sortSchedule(current.map((item) => (item.id === updated.id ? updated : item))));
      setNotice("Horario cancelado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel cancelar o horario.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteScheduleSlot(slot: ScheduleSlot) {
    const confirmed = window.confirm(`Excluir ${slot.date} ${slot.time}? Somente horarios sem reservas podem ser apagados.`);
    if (!confirmed) return;

    setSavingId(`delete_${slot.id}`);
    setError(null);
    setNotice(null);

    try {
      await adminService.deleteScheduleSlot(slot.id);
      setSchedule((current) => current.filter((item) => item.id !== slot.id));
      setNotice("Horario excluido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel excluir o horario.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Passeios"
        title="Passeios, canoas e agenda"
        description="Gerencie os produtos vendidos, a frota disponível e os horários criados."
        action={
          <div className="inline-flex rounded-2xl border border-line bg-white p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-10 rounded-xl px-4 text-sm font-bold ${activeTab === tab.id ? "bg-ocean text-white" : "text-muted hover:bg-surface"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      {error ? <p className="mt-5 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">{error}</p> : null}
      {notice ? <p className="mt-5 rounded-2xl border border-success/20 bg-success/10 p-4 text-sm font-semibold text-success">{notice}</p> : null}

      {activeTab === "experiences" ? (
        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Catalogo</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-deep">{experiences.length} passeio(s)</h3>
              </div>
              <PrimaryButton type="button" className="min-h-11 px-4 py-2" onClick={beginCreateExperience}>
                <Plus size={16} />
                Criar
              </PrimaryButton>
            </div>

            <div className="mt-6 grid gap-3">
              {experiences.map((experience) => {
                const policy = getExperienceBookingPolicy(experience);
                const selected = editingExperienceId === experience.id;

                return (
                  <article key={experience.id} className={`rounded-2xl border p-4 ${selected ? "border-ocean bg-ocean/5" : "border-line bg-surface"}`}>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge tone={experience.isActive ? "success" : "neutral"}>{experience.isActive ? "ativo" : "inativo"}</StatusBadge>
                          <StatusBadge tone={policy.canReserveOnline ? "info" : "warning"}>{policy.publicLabel}</StatusBadge>
                          <StatusBadge>{experience.kind}</StatusBadge>
                        </div>
                        <h4 className="mt-3 font-display text-xl font-bold text-deep">{experience.name}</h4>
                        <p className="mt-1 text-sm text-muted">
                          {experience.slug} - {centsToCurrency(experience.priceCents)} - {experience.scheduleLabel}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <IconButton label="Editar" disabled={savingId === experience.id} onClick={() => beginEditExperience(experience)}>
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton label="Duplicar" disabled={savingId === `duplicate_${experience.id}`} onClick={() => duplicateExperience(experience)}>
                          <Copy size={16} />
                        </IconButton>
                        <IconButton label={experience.isActive ? "Desativar" : "Ativar"} disabled={savingId === experience.id} onClick={() => toggleExperience(experience)}>
                          <Power size={16} />
                        </IconButton>
                        <IconButton label="Excluir" disabled={savingId === `delete_${experience.id}`} onClick={() => deleteExperience(experience)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <ExperienceFormPanel
            draft={experienceForm}
            title={editingExperienceId === "new" ? "Novo passeio" : editingExperience ? "Editar passeio" : "Selecione um passeio"}
            disabled={!editingExperienceId || Boolean(savingId)}
            saving={savingId === editingExperienceId || savingId === "experience"}
            onChange={setExperienceForm}
            onCancel={() => setEditingExperienceId(null)}
            onSubmit={submitExperience}
          />
        </section>
      ) : null}

      {activeTab === "canoes" ? (
        <section className="mt-8 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <form className="rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6" onSubmit={createCanoe}>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Nova canoa</p>
            <h3 className="mt-1 font-display text-2xl font-bold text-deep">Cadastro da frota</h3>
            <div className="mt-5 grid gap-4">
              <Input label="Nome" value={canoeForm.name} onChange={(value) => setCanoeForm((form) => ({ ...form, name: value }))} />
              <Input
                label="Capacidade"
                type="number"
                value={String(canoeForm.capacity)}
                onChange={(value) => setCanoeForm((form) => ({ ...form, capacity: Number(value) }))}
              />
              <label className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-bold text-deep">
                Ativa
                <input
                  type="checkbox"
                  checked={canoeForm.isActive}
                  onChange={(event) => setCanoeForm((form) => ({ ...form, isActive: event.target.checked }))}
                  className="h-5 w-5 accent-[#0077be]"
                />
              </label>
              <PrimaryButton type="submit" disabled={savingId === "canoe_new"}>
                <Plus size={16} />
                Criar canoa
              </PrimaryButton>
            </div>
          </form>

          <div className="rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Frota</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-deep">
                  {activeCanoes.length}/{canoes.length} ativa(s)
                </h3>
              </div>
              <StatusBadge tone="info">{activeCanoes.reduce((total, canoe) => total + canoe.capacity, 0)} vagas ativas</StatusBadge>
            </div>
            <div className="mt-6 grid gap-3">
              {canoes.map((canoe) => (
                <CanoeRow
                  key={canoe.id}
                  canoe={canoe}
                  saving={savingId === canoe.id}
                  deleting={savingId === `delete_${canoe.id}`}
                  onSave={(input) => saveCanoe(canoe.id, input)}
                  onDelete={() => deleteCanoe(canoe)}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "schedule" ? (
        <section className="mt-8 rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Agenda</p>
              <h3 className="mt-1 font-display text-2xl font-bold text-deep">horários criados</h3>
            </div>
            <StatusBadge tone="info">{schedule.length} slot(s)</StatusBadge>
          </div>
          <form className="mt-6 rounded-2xl border border-line bg-surface p-4" onSubmit={createScheduleSlot}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Novo horario</p>
                <h4 className="mt-1 font-display text-xl font-bold text-deep">Agendar passeio</h4>
              </div>
              <CalendarDays className="text-turquoise" size={26} />
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-4">
              <Select
                label="Passeio"
                value={scheduleForm.experienceSlug}
                options={experiences.map((experience) => ({ value: experience.slug, label: experience.name }))}
                onChange={updateScheduleExperience}
              />
              <Input label="Data" type="date" value={scheduleForm.date} onChange={(value) => setScheduleForm((form) => ({ ...form, date: value }))} />
              <Input label="Hora" type="time" value={scheduleForm.time} onChange={(value) => setScheduleForm((form) => ({ ...form, time: value }))} />
              <Input
                label="Capacidade manual"
                type="number"
                value={String(scheduleForm.capacityTotal)}
                onChange={(value) => setScheduleForm((form) => ({ ...form, capacityTotal: Number(value) }))}
              />
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {scheduleForm.canoes.map((slotCanoe, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_120px]">
                  <Select
                    label={`Canoa ${index + 1}`}
                    value={slotCanoe.canoeId}
                    options={[
                      { value: "", label: "Sem canoa" },
                      ...activeCanoes.map((canoe) => ({ value: canoe.id, label: canoe.name })),
                    ]}
                    onChange={(value) => updateScheduleCanoe(index, value)}
                  />
                  <Input
                    label="Vagas"
                    type="number"
                    value={String(slotCanoe.capacity)}
                    onChange={(value) => updateScheduleCanoeCapacity(index, Number(value))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
              <Input
                label="Observacao admin"
                value={scheduleForm.adminNotes ?? ""}
                onChange={(value) => setScheduleForm((form) => ({ ...form, adminNotes: value }))}
              />
              <StatusBadge tone="info">{scheduleCapacityTotal} vaga(s)</StatusBadge>
              <PrimaryButton type="submit" disabled={savingId === "schedule_new" || !currentScheduleExperience}>
                <Plus size={16} />
                Criar horario
              </PrimaryButton>
            </div>
          </form>
          <div className="mt-6 grid gap-3">
            {schedule.length > 0 ? (
              schedule.map((slot) => (
                <article key={slot.id} className="rounded-2xl border border-line bg-surface p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                    <div>
                      <p className="font-display text-lg font-bold text-deep">
                        {slot.date} - {slot.time} - {slot.experienceName}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {slot.confirmedParticipants} confirmado(s), {slot.pendingParticipants} pendente(s), {slot.availableSpots} vaga(s)
                      </p>
                      {slot.adminNotes ? <p className="mt-1 text-xs font-semibold text-muted">{slot.adminNotes}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-deep">{slot.capacityTotal} capacidade</p>
                      <StatusBadge tone={scheduleTone(slot.status)}>{slot.status}</StatusBadge>
                    </div>
                    <div className="flex gap-2">
                      <IconButton
                        label={slot.status === "blocked" ? "Liberar" : "Bloquear"}
                        disabled={savingId === slot.id || slot.status === "cancelled"}
                        onClick={() => toggleScheduleSlot(slot)}
                      >
                        <Power size={16} />
                      </IconButton>
                      <IconButton
                        label="Cancelar"
                        disabled={savingId === `cancel_${slot.id}` || slot.status === "cancelled"}
                        onClick={() => cancelScheduleSlot(slot)}
                      >
                        <XCircle size={16} />
                      </IconButton>
                      <IconButton label="Excluir" disabled={savingId === `delete_${slot.id}`} onClick={() => deleteScheduleSlot(slot)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState title="Nenhum horário" description="Ainda nao ha horários futuros cadastrados." />
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ExperienceFormPanel({
  title,
  draft,
  disabled,
  saving,
  onChange,
  onCancel,
  onSubmit,
}: {
  title: string;
  draft: CreateExperienceInput;
  disabled: boolean;
  saving: boolean;
  onChange: (value: CreateExperienceInput) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6" onSubmit={onSubmit}>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Edição</p>
      <h3 className="mt-1 font-display text-2xl font-bold text-deep">{title}</h3>
      {disabled ? (
        <div className="mt-5">
          <EmptyState title="Nenhum formulário aberto" description="Use criar ou editar para alterar um passeio." />
        </div>
      ) : (
        <div className="mt-5 grid gap-3">
          <Input label="Nome" value={draft.name} onChange={(value) => onChange({ ...draft, name: value })} />
          <Input label="Slug" value={draft.slug} onChange={(value) => onChange({ ...draft, slug: value })} />
          <Select
            label="Tipo"
            value={draft.kind}
            options={[
              { value: "regular", label: "Regular" },
              { value: "celebration", label: "Comemoracao" },
              { value: "expedition", label: "Expediçao" },
            ]}
            onChange={(value) =>
              onChange({
                ...draft,
                kind: value as CreateExperienceInput["kind"],
                scheduleMode: value === "regular" ? draft.scheduleMode : "manual",
              })
            }
          />
          <Select
            label="Agenda"
            value={draft.kind === "regular" ? draft.scheduleMode : "manual"}
            options={
              draft.kind === "regular"
                ? [
                    { value: "daily_default", label: "Todos os dias" },
                    { value: "manual", label: "Datas especificas" },
                  ]
                : [{ value: "manual", label: "Datas especificas" }]
            }
            onChange={(value) => onChange({ ...draft, scheduleMode: value as CreateExperienceInput["scheduleMode"] })}
          />
          <Input label="Resumo" value={draft.shortDescription} onChange={(value) => onChange({ ...draft, shortDescription: value })} />
          <Input label="Descricao" value={draft.description} onChange={(value) => onChange({ ...draft, description: value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Preco em centavos" type="number" value={String(draft.priceCents)} onChange={(value) => onChange({ ...draft, priceCents: Number(value) })} />
            <Input label="Duracao" type="number" value={String(draft.durationMinutes)} onChange={(value) => onChange({ ...draft, durationMinutes: Number(value) })} />
            <Input label="Minimo" type="number" value={String(draft.minParticipants)} onChange={(value) => onChange({ ...draft, minParticipants: Number(value) })} />
            <Input label="Maximo" type="number" value={String(draft.maxParticipants)} onChange={(value) => onChange({ ...draft, maxParticipants: Number(value) })} />
          </div>
          <Input label="Rotulo de horário" value={draft.scheduleLabel} onChange={(value) => onChange({ ...draft, scheduleLabel: value })} />
          <Input label="horários sugeridos" value={listToCsv(draft.availableTimes)} onChange={(value) => onChange({ ...draft, availableTimes: csvToList(value) })} />
          <Input label="Ponto de encontro" value={draft.meetingPoint} onChange={(value) => onChange({ ...draft, meetingPoint: value })} />
          <Select
            label="Dificuldade"
            value={draft.difficulty}
            options={[
              { value: "iniciante", label: "Iniciante" },
              { value: "intermediario", label: "Intermediario" },
              { value: "avancado", label: "Avancado" },
            ]}
            onChange={(value) => onChange({ ...draft, difficulty: value as CreateExperienceInput["difficulty"] })}
          />
          <Input label="Cotas" type="number" value={String(draft.quotaCost)} onChange={(value) => onChange({ ...draft, quotaCost: Number(value) })} />
          <Input label="Classe visual" value={draft.imageClass} onChange={(value) => onChange({ ...draft, imageClass: value })} />
          <label className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-bold text-deep">
            Ativo
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => onChange({ ...draft, isActive: event.target.checked })}
              className="h-5 w-5 accent-[#0077be]"
            />
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <PrimaryButton type="button" variant="secondary" disabled={saving} onClick={onCancel}>
              Cancelar
            </PrimaryButton>
            <PrimaryButton type="submit" disabled={saving}>
              <Save size={16} />
              Salvar
            </PrimaryButton>
          </div>
        </div>
      )}
    </form>
  );
}

function CanoeRow({
  canoe,
  saving,
  deleting,
  onSave,
  onDelete,
}: {
  canoe: Canoe;
  saving: boolean;
  deleting: boolean;
  onSave: (input: UpdateCanoeInput) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState({ name: canoe.name, capacity: canoe.capacity, isActive: canoe.isActive });

  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_120px_auto_auto] lg:items-end">
        <Input label="Nome" value={draft.name} onChange={(value) => setDraft((current) => ({ ...current, name: value }))} />
        <Input label="Capacidade" type="number" value={String(draft.capacity)} onChange={(value) => setDraft((current) => ({ ...current, capacity: Number(value) }))} />
        <label className="flex h-11 items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 text-sm font-bold text-deep">
          Ativa
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
            className="h-5 w-5 accent-[#0077be]"
          />
        </label>
        <div className="flex gap-2">
          <IconButton label="Salvar" disabled={saving} onClick={() => onSave(draft)}>
            <Save size={16} />
          </IconButton>
          <IconButton label="Excluir" disabled={deleting} onClick={onDelete}>
            <Trash2 size={16} />
          </IconButton>
        </div>
      </div>
    </article>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-deep transition hover:border-turquoise hover:bg-turquoise/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
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
