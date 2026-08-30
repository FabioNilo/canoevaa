"use client";

import { BadgeCheck, CalendarClock, ChevronDown, Pencil, Plus, RefreshCcw, TicketCheck, Trash2, Wallet } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { EmptyState, MetricCard, PageHeader, StatusBadge } from "@/components/admin/ui";
import { PrimaryButton } from "@/components/PrimaryButton";
import { centsToCurrency } from "@/domain/rules";
import type {
  AdminCustomer,
  AdminMembershipCustomer,
  AdminMembershipDetail,
  AdminMembershipListItem,
  AdminMembershipPlan,
  MembershipCustomerInput,
  MembershipPaymentStatus,
  MembershipStatus,
  QuotaMovementType,
} from "@/domain/types";
import { adminService } from "@/services/admin-service";

const statusLabels: Record<MembershipStatus, string> = {
  active: "Ativo",
  past_due: "Inadimplente",
  suspended: "Suspenso",
  cancelled: "Cancelado",
};

const statusOrder: MembershipStatus[] = ["active", "past_due", "suspended", "cancelled"];

const movementLabels: Record<QuotaMovementType, string> = {
  grant: "Concessao",
  debit: "Uso",
  refund: "Estorno",
  adjustment: "Ajuste",
  expire: "Expiracao",
};

const paymentStatusLabels: Record<MembershipPaymentStatus, string> = {
  pending: "Pendente",
  paid: "Paga",
  expired: "Expirada",
  refunded: "Estornada",
  cancelled: "Cancelada",
};

function statusTone(status: MembershipStatus) {
  if (status === "active") return "success";
  if (status === "past_due") return "warning";
  if (status === "suspended" || status === "cancelled") return "danger";
  return "neutral";
}

function paymentTone(status: MembershipPaymentStatus) {
  if (status === "paid") return "success";
  if (status === "pending") return "warning";
  return "danger";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function periodLabel(plan: AdminMembershipPlan) {
  return plan.quotaPeriod === "monthly" ? "mes" : "semana";
}

function emptyCustomer(): MembershipCustomerInput {
  return {
    name: "",
    phone: "",
    email: "",
    cpf: "",
    rg: "",
    birthDate: "",
    addressLine: "",
    city: "",
    state: "",
    zipCode: "",
  };
}

function customerToInput(customer: AdminMembershipCustomer): MembershipCustomerInput {
  return {
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? "",
    cpf: customer.cpf ?? "",
    rg: customer.rg ?? "",
    birthDate: customer.birthDate ?? "",
    addressLine: customer.addressLine ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    zipCode: customer.zipCode ?? "",
  };
}

const fieldClass = "min-h-11 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-deep";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-bold text-deep">
      {label}
      {children}
    </label>
  );
}

function CustomerFields({
  value,
  onChange,
}: {
  value: MembershipCustomerInput;
  onChange: (patch: Partial<MembershipCustomerInput>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Field label="Nome *">
        <input className={fieldClass} value={value.name} onChange={(e) => onChange({ name: e.target.value })} />
      </Field>
      <Field label="Telefone *">
        <input className={fieldClass} value={value.phone} onChange={(e) => onChange({ phone: e.target.value })} />
      </Field>
      <Field label="E-mail">
        <input className={fieldClass} type="email" value={value.email} onChange={(e) => onChange({ email: e.target.value })} />
      </Field>
      <Field label="CPF">
        <input className={fieldClass} value={value.cpf} onChange={(e) => onChange({ cpf: e.target.value })} />
      </Field>
      <Field label="RG">
        <input className={fieldClass} value={value.rg} onChange={(e) => onChange({ rg: e.target.value })} />
      </Field>
      <Field label="Nascimento">
        <input className={fieldClass} type="date" value={value.birthDate} onChange={(e) => onChange({ birthDate: e.target.value })} />
      </Field>
      <Field label="Endereco">
        <input className={fieldClass} value={value.addressLine} onChange={(e) => onChange({ addressLine: e.target.value })} />
      </Field>
      <Field label="Cidade">
        <input className={fieldClass} value={value.city} onChange={(e) => onChange({ city: e.target.value })} />
      </Field>
      <Field label="UF">
        <input className={fieldClass} maxLength={2} value={value.state} onChange={(e) => onChange({ state: e.target.value })} />
      </Field>
      <Field label="CEP">
        <input className={fieldClass} value={value.zipCode} onChange={(e) => onChange({ zipCode: e.target.value })} />
      </Field>
    </div>
  );
}

type QuotaDraft = { amount: string; reason: string };
type EditForm = { planId: string; startedAt: string; customer: MembershipCustomerInput };

export function AssociadosClient({
  initialMemberships,
  plans,
  customers,
}: {
  initialMemberships: AdminMembershipListItem[];
  plans: AdminMembershipPlan[];
  customers: AdminCustomer[];
}) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<"existing" | "new">("existing");
  const [createForm, setCreateForm] = useState({
    customerId: "",
    planId: plans[0]?.id ?? "",
    startedAt: "",
  });
  const [createCustomer, setCreateCustomer] = useState<MembershipCustomerInput>(emptyCustomer);
  const [quotaDrafts, setQuotaDrafts] = useState<Record<string, QuotaDraft>>({});
  const [details, setDetails] = useState<Record<string, AdminMembershipDetail>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const linkedCustomerIds = useMemo(
    () => new Set(memberships.map((membership) => membership.customerId)),
    [memberships],
  );
  const availableCustomers = customers.filter((customer) => !linkedCustomerIds.has(customer.id));

  const activeCount = memberships.filter((membership) => membership.status === "active").length;
  const pastDueCount = memberships.filter((membership) => membership.status === "past_due").length;
  const quotasUsedInPeriod = memberships.reduce((total, membership) => total + membership.quotaUsedInPeriod, 0);
  const recurringRevenueCents = memberships
    .filter((membership) => membership.status === "active")
    .reduce((total, membership) => total + membership.plan.priceCents, 0);

  function quotaDraftFor(id: string): QuotaDraft {
    return quotaDrafts[id] ?? { amount: "", reason: "" };
  }

  function setQuotaDraft(id: string, patch: Partial<QuotaDraft>) {
    setQuotaDrafts((current) => ({ ...current, [id]: { ...quotaDraftFor(id), ...patch } }));
  }

  function replaceMembership(next: AdminMembershipDetail) {
    setMemberships((current) => current.map((membership) => (membership.id === next.id ? next : membership)));
    setDetails((current) => ({ ...current, [next.id]: next }));
  }

  async function ensureDetail(id: string): Promise<AdminMembershipDetail> {
    if (details[id]) return details[id];
    const detail = await adminService.getMembership(id);
    setDetails((current) => ({ ...current, [id]: detail }));
    return detail;
  }

  async function toggleDetail(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    if (details[id]) return;

    setLoadingDetailId(id);
    setError(null);

    try {
      await ensureDetail(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o historico.");
      setExpandedId(null);
    } finally {
      setLoadingDetailId(null);
    }
  }

  async function renewDuePeriods() {
    setRenewing(true);
    setError(null);
    setNotice(null);

    try {
      const result = await adminService.renewMembershipPeriods();
      const refreshed = await adminService.listMemberships();
      setMemberships(refreshed);
      setDetails({});
      setNotice(`Renovacao concluida: ${result.processed} associacao(oes) processada(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel renovar os periodos.");
    } finally {
      setRenewing(false);
    }
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createForm.planId) {
      setError("Selecione um plano.");
      return;
    }
    if (createMode === "existing" && !createForm.customerId) {
      setError("Selecione um cliente.");
      return;
    }
    if (createMode === "new" && (createCustomer.name.trim().length < 2 || createCustomer.phone.trim().length < 8)) {
      setError("Informe nome e telefone do novo associado.");
      return;
    }

    setSavingId("create");
    setError(null);
    setNotice(null);

    try {
      const created = await adminService.createMembership({
        planId: createForm.planId,
        startedAt: createForm.startedAt || undefined,
        ...(createMode === "existing"
          ? { customerId: createForm.customerId }
          : { customer: createCustomer }),
      });
      setMemberships((current) => [created, ...current]);
      setDetails((current) => ({ ...current, [created.id]: created }));
      setShowCreate(false);
      setCreateForm({ customerId: "", planId: plans[0]?.id ?? "", startedAt: "" });
      setCreateCustomer(emptyCustomer());
      setNotice(`Associacao criada para ${created.customerName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar a associacao.");
    } finally {
      setSavingId(null);
    }
  }

  async function beginEdit(membership: AdminMembershipListItem) {
    setError(null);
    setNotice(null);

    if (editingId === membership.id) {
      setEditingId(null);
      setEditForm(null);
      return;
    }

    setLoadingDetailId(membership.id);
    try {
      const detail = await ensureDetail(membership.id);
      setEditingId(membership.id);
      setEditForm({
        planId: detail.plan.id,
        startedAt: detail.startedAt.slice(0, 10),
        customer: customerToInput(detail.customer),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o cadastro.");
    } finally {
      setLoadingDetailId(null);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>, membership: AdminMembershipListItem) {
    event.preventDefault();
    if (!editForm) return;

    setSavingId(`edit_${membership.id}`);
    setError(null);
    setNotice(null);

    try {
      const updated = await adminService.updateMembership(membership.id, {
        planId: editForm.planId,
        startedAt: editForm.startedAt || undefined,
        customer: editForm.customer,
      });
      replaceMembership(updated);
      setEditingId(null);
      setEditForm(null);
      setNotice(`${updated.customerName}: cadastro atualizado.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o cadastro.");
    } finally {
      setSavingId(null);
    }
  }

  async function removeMembership(membership: AdminMembershipListItem) {
    const confirmed = window.confirm(
      `Remover a associacao de ${membership.customerName}? O historico de cotas e mensalidades sera apagado. O cliente e as reservas nao sao excluidos.`,
    );
    if (!confirmed) return;

    setSavingId(`delete_${membership.id}`);
    setError(null);
    setNotice(null);

    try {
      await adminService.deleteMembership(membership.id);
      setMemberships((current) => current.filter((item) => item.id !== membership.id));
      setDetails((current) => {
        const next = { ...current };
        delete next[membership.id];
        return next;
      });
      if (expandedId === membership.id) setExpandedId(null);
      if (editingId === membership.id) {
        setEditingId(null);
        setEditForm(null);
      }
      setNotice(`Associacao de ${membership.customerName} removida.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel remover a associacao.");
    } finally {
      setSavingId(null);
    }
  }

  async function changeStatus(membership: AdminMembershipListItem, status: MembershipStatus) {
    if (status === membership.status) return;

    setSavingId(`status_${membership.id}`);
    setError(null);
    setNotice(null);

    try {
      const updated = await adminService.updateMembershipStatus(membership.id, status);
      replaceMembership(updated);
      setNotice(`${updated.customerName}: status alterado para ${statusLabels[status].toLowerCase()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel alterar o status.");
    } finally {
      setSavingId(null);
    }
  }

  async function submitQuota(event: FormEvent<HTMLFormElement>, membership: AdminMembershipListItem) {
    event.preventDefault();
    const draft = quotaDraftFor(membership.id);
    const amount = Number(draft.amount);

    if (!Number.isInteger(amount) || amount === 0) {
      setError("Informe um ajuste de cotas inteiro e diferente de zero.");
      return;
    }

    setSavingId(`quota_${membership.id}`);
    setError(null);
    setNotice(null);

    try {
      const updated = await adminService.adjustMembershipQuota(membership.id, {
        amount,
        reason: draft.reason,
      });
      replaceMembership(updated);
      setQuotaDrafts((current) => ({ ...current, [membership.id]: { amount: "", reason: "" } }));
      setNotice(`${updated.customerName}: saldo ajustado para ${updated.quotaBalance} cota(s).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel ajustar as cotas.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Associados"
        title="Planos e cotas"
        description="Cadastro de associados, saldo de cotas do periodo e situacao das mensalidades."
        action={
          <div className="flex flex-wrap gap-2">
            <PrimaryButton type="button" variant="secondary" onClick={renewDuePeriods} disabled={renewing}>
              <RefreshCcw size={18} />
              {renewing ? "Renovando..." : "Renovar periodos"}
            </PrimaryButton>
            <PrimaryButton type="button" onClick={() => setShowCreate((value) => !value)}>
              <Plus size={18} />
              Novo associado
            </PrimaryButton>
          </div>
        }
      />

      {error ? (
        <p className="mt-6 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-bold text-danger">{error}</p>
      ) : null}
      {notice ? (
        <p className="mt-6 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-bold text-success">{notice}</p>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard icon={<BadgeCheck size={24} />} label="Ativos" value={activeCount} />
        <MetricCard icon={<CalendarClock size={24} />} label="Inadimplentes" value={pastDueCount} />
        <MetricCard icon={<TicketCheck size={24} />} label="Cotas usadas no periodo" value={quotasUsedInPeriod} />
        <MetricCard icon={<Wallet size={24} />} label="Receita recorrente" value={centsToCurrency(recurringRevenueCents)} />
      </section>

      {showCreate ? (
        <section className="mt-8 rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
          <h3 className="font-display text-2xl font-bold text-deep">Novo associado</h3>
          <p className="mt-1 text-sm text-muted">
            A primeira cota e concedida e a mensalidade fica pendente. Escolha um cliente ja cadastrado ou preencha os dados manualmente.
          </p>

          <div className="mt-4 inline-flex rounded-xl border border-line bg-surface p-1 text-sm font-bold">
            <button
              type="button"
              onClick={() => setCreateMode("existing")}
              className={`rounded-lg px-4 py-2 transition ${createMode === "existing" ? "bg-ocean text-white" : "text-muted"}`}
            >
              Cliente existente
            </button>
            <button
              type="button"
              onClick={() => setCreateMode("new")}
              className={`rounded-lg px-4 py-2 transition ${createMode === "new" ? "bg-ocean text-white" : "text-muted"}`}
            >
              Novo cadastro
            </button>
          </div>

          <form className="mt-5 grid gap-4" onSubmit={submitCreate}>
            {createMode === "existing" ? (
              availableCustomers.length === 0 ? (
                <p className="rounded-xl bg-surface px-3 py-2 text-sm text-muted">
                  Todos os clientes cadastrados ja possuem associacao. Use &quot;Novo cadastro&quot;.
                </p>
              ) : (
                <Field label="Cliente">
                  <select
                    className={fieldClass}
                    value={createForm.customerId}
                    onChange={(event) => setCreateForm((form) => ({ ...form, customerId: event.target.value }))}
                  >
                    <option value="">Selecione...</option>
                    {availableCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.phone ? ` - ${customer.phone}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              )
            ) : (
              <CustomerFields value={createCustomer} onChange={(patch) => setCreateCustomer((c) => ({ ...c, ...patch }))} />
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="Plano">
                <select
                  className={fieldClass}
                  value={createForm.planId}
                  onChange={(event) => setCreateForm((form) => ({ ...form, planId: event.target.value }))}
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - {centsToCurrency(plan.priceCents)} / {periodLabel(plan)} - {plan.quotaAllowance} cota(s)
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Inicio (opcional)">
                <input
                  type="date"
                  className={fieldClass}
                  value={createForm.startedAt}
                  onChange={(event) => setCreateForm((form) => ({ ...form, startedAt: event.target.value }))}
                />
              </Field>
              <div className="flex items-end">
                <PrimaryButton type="submit" disabled={savingId === "create"} className="w-full">
                  {savingId === "create" ? "Criando..." : "Criar associacao"}
                </PrimaryButton>
              </div>
            </div>
          </form>
        </section>
      ) : null}

      <section className="mt-8 rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Carteira</p>
            <h3 className="mt-1 font-display text-2xl font-bold text-deep">Associados</h3>
          </div>
          <StatusBadge tone="info">{memberships.length} registro(s)</StatusBadge>
        </div>

        <div className="mt-6 grid gap-3">
          {memberships.length > 0 ? (
            [...memberships]
              .sort(
                (a, b) =>
                  statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) ||
                  a.customerName.localeCompare(b.customerName),
              )
              .map((membership) => {
                const draft = quotaDraftFor(membership.id);
                const busy = savingId?.endsWith(membership.id) ?? false;
                const detail = details[membership.id];

                return (
                  <article key={membership.id} className="rounded-2xl border border-line bg-surface p-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-xl font-bold text-deep">{membership.customerName}</p>
                          <StatusBadge tone={statusTone(membership.status)}>{statusLabels[membership.status]}</StatusBadge>
                          {membership.openPaymentsCount > 0 ? (
                            <StatusBadge tone="warning">{membership.openPaymentsCount} fatura(s) em aberto</StatusBadge>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-muted">
                          {membership.plan.name} - {centsToCurrency(membership.plan.priceCents)} por {periodLabel(membership.plan)} -{" "}
                          {membership.plan.quotaAllowance} cota(s)
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {membership.customerPhone || "Telefone nao informado"}
                          {membership.customerEmail ? ` - ${membership.customerEmail}` : ""}
                        </p>
                        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-deep">
                          <CalendarClock size={16} />
                          Proxima mensalidade em {formatDate(membership.nextDueAt)}
                        </p>
                      </div>

                      <div className="grid content-start gap-2">
                        <div className="rounded-xl border border-line bg-white px-3 py-2">
                          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Saldo de cotas</p>
                          <p className="mt-1 font-display text-2xl font-bold text-ocean">{membership.quotaBalance}</p>
                        </div>
                        <div className="rounded-xl border border-line bg-white px-3 py-2">
                          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Uso no periodo</p>
                          <p className="mt-1 text-sm font-bold text-deep">
                            {membership.quotaUsedInPeriod} de {membership.plan.quotaAllowance} - renova{" "}
                            {formatDate(membership.currentPeriodEnd)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-line pt-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        Status
                        <select
                          className="min-h-10 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-deep"
                          value={membership.status}
                          disabled={busy}
                          onChange={(event) => changeStatus(membership, event.target.value as MembershipStatus)}
                        >
                          {statusOrder.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </label>

                      <form
                        className="grid gap-2 sm:grid-cols-[110px_minmax(0,1fr)_auto]"
                        onSubmit={(event) => submitQuota(event, membership)}
                      >
                        <input
                          type="number"
                          step={1}
                          placeholder="+/- cotas"
                          className="min-h-10 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-deep"
                          value={draft.amount}
                          onChange={(event) => setQuotaDraft(membership.id, { amount: event.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="Motivo do ajuste"
                          className="min-h-10 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-deep"
                          value={draft.reason}
                          onChange={(event) => setQuotaDraft(membership.id, { reason: event.target.value })}
                        />
                        <PrimaryButton type="submit" variant="secondary" disabled={busy} className="min-h-10 px-4 py-2">
                          {savingId === `quota_${membership.id}` ? "Aplicando..." : "Ajustar cotas"}
                        </PrimaryButton>
                      </form>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => toggleDetail(membership.id)}
                        className="inline-flex items-center gap-2 text-sm font-bold text-ocean hover:text-deep"
                      >
                        <ChevronDown size={16} className={`transition ${expandedId === membership.id ? "rotate-180" : ""}`} />
                        {expandedId === membership.id ? "Ocultar historico" : "Ver historico de cotas e faturas"}
                      </button>
                      <button
                        type="button"
                        onClick={() => beginEdit(membership)}
                        disabled={busy}
                        className="inline-flex items-center gap-2 text-sm font-bold text-ocean hover:text-deep"
                      >
                        <Pencil size={15} />
                        {editingId === membership.id ? "Fechar edicao" : "Editar cadastro"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMembership(membership)}
                        disabled={busy}
                        className="inline-flex items-center gap-2 text-sm font-bold text-danger hover:text-deep"
                      >
                        <Trash2 size={15} />
                        {savingId === `delete_${membership.id}` ? "Removendo..." : "Remover"}
                      </button>
                    </div>

                    {editingId === membership.id && editForm ? (
                      <form className="mt-3 border-t border-line pt-4" onSubmit={(event) => submitEdit(event, membership)}>
                        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Editar cadastro e plano</p>
                        <div className="mt-3">
                          <CustomerFields
                            value={editForm.customer}
                            onChange={(patch) =>
                              setEditForm((form) => (form ? { ...form, customer: { ...form.customer, ...patch } } : form))
                            }
                          />
                        </div>
                        <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          <Field label="Plano">
                            <select
                              className={fieldClass}
                              value={editForm.planId}
                              onChange={(event) =>
                                setEditForm((form) => (form ? { ...form, planId: event.target.value } : form))
                              }
                            >
                              {plans.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                  {plan.name} - {centsToCurrency(plan.priceCents)} / {periodLabel(plan)}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Inicio">
                            <input
                              type="date"
                              className={fieldClass}
                              value={editForm.startedAt}
                              onChange={(event) =>
                                setEditForm((form) => (form ? { ...form, startedAt: event.target.value } : form))
                              }
                            />
                          </Field>
                          <div className="flex items-end gap-2">
                            <PrimaryButton type="submit" disabled={savingId === `edit_${membership.id}`} className="flex-1">
                              {savingId === `edit_${membership.id}` ? "Salvando..." : "Salvar"}
                            </PrimaryButton>
                            <PrimaryButton
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null);
                                setEditForm(null);
                              }}
                            >
                              Cancelar
                            </PrimaryButton>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-muted">
                          Alterar o inicio recalcula o periodo vigente. Trocar de plano nao ajusta o saldo automaticamente.
                        </p>
                      </form>
                    ) : null}

                    {expandedId === membership.id ? (
                      <div className="mt-3 border-t border-line pt-4">
                        {loadingDetailId === membership.id || !detail ? (
                          <p className="text-sm text-muted">Carregando historico...</p>
                        ) : (
                          <div className="grid gap-5 lg:grid-cols-2">
                            <div>
                              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                                Movimentacoes de cota
                              </p>
                              <div className="mt-2 grid gap-1">
                                {detail.quotaMovements.length > 0 ? (
                                  detail.quotaMovements.map((movement) => (
                                    <div
                                      key={movement.id}
                                      className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                                    >
                                      <span className="text-muted">
                                        {formatDate(movement.createdAt)} - {movementLabels[movement.type]}
                                        {movement.reservationCode ? ` (${movement.reservationCode})` : ""}
                                        {movement.reason ? ` - ${movement.reason}` : ""}
                                      </span>
                                      <span className={`font-bold ${movement.amount < 0 ? "text-danger" : "text-success"}`}>
                                        {movement.amount > 0 ? `+${movement.amount}` : movement.amount}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted">Sem movimentacoes.</p>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Mensalidades</p>
                              <div className="mt-2 grid gap-1">
                                {detail.payments.length > 0 ? (
                                  detail.payments.map((payment) => (
                                    <div
                                      key={payment.id}
                                      className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                                    >
                                      <span className="text-muted">
                                        {formatDate(payment.periodStart)} - {formatDate(payment.periodEnd)} - vence{" "}
                                        {formatDate(payment.dueAt)}
                                      </span>
                                      <span className="flex items-center gap-2">
                                        <span className="font-bold text-deep">{centsToCurrency(payment.amountCents)}</span>
                                        <StatusBadge tone={paymentTone(payment.status)}>
                                          {paymentStatusLabels[payment.status]}
                                        </StatusBadge>
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted">Sem mensalidades registradas.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })
          ) : (
            <EmptyState
              title="Nenhum associado"
              description="Use 'Novo associado' para cadastrar um associado e comecar a controlar cotas."
            />
          )}
        </div>
      </section>
    </div>
  );
}
