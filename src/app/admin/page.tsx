"use client";

import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, UsersRound, XCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { MockRoleGuard } from "@/components/MockRoleGuard";
import { centsToCurrency } from "@/domain/rules";
import type { AdminOverview, AdminPermission, AdminUser, Reservation, ReservationStatus } from "@/domain/types";
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

export default function AdminPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    adminService
      .getOverview()
      .then((data) => {
        if (active) setOverview(data);
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

  if (loading) {
    return <main className="min-h-screen bg-surface px-4 py-10 text-muted">Carregando painel administrativo...</main>;
  }

  if (error && !overview) {
    return <main className="min-h-screen bg-surface px-4 py-10 text-danger">{error}</main>;
  }

  if (!overview) {
    return <main className="min-h-screen bg-surface px-4 py-10 text-muted">Nenhum dado administrativo encontrado.</main>;
  }

  return (
    <MockRoleGuard role="admin">
      <main className="min-h-screen bg-surface px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-ocean">
              <ArrowLeft size={18} />
              Voltar ao site
            </Link>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Administração</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-deep">Permissões e confirmações</h1>
          </div>
          <span className="w-fit rounded-full bg-deep px-4 py-2 text-sm font-bold text-white">API mockada</span>
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

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-line bg-white p-5 deep-shadow sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Reservas</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-deep">Confirmações de remada</h2>
              </div>
              <ShieldCheck className="text-turquoise" size={28} />
            </div>

            <div className="mt-6 space-y-4">
              {overview.confirmations.map((item) => (
                <ReservationAdminCard
                  key={item.id}
                  reservation={item}
                  saving={savingId === item.id}
                  onConfirm={() => setConfirmationStatus(item.id, "confirmed")}
                  onReject={() => setConfirmationStatus(item.id, "cancelled")}
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
        </section>
      </div>
      </main>
    </MockRoleGuard>
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
        </div>

        <div className="flex gap-2">
          <PrimaryButton type="button" className="min-h-10 px-3 py-2 text-xs" disabled={saving} onClick={onConfirm}>
            Confirmar
          </PrimaryButton>
          <PrimaryButton type="button" variant="secondary" className="min-h-10 px-3 py-2 text-xs" disabled={saving} onClick={onReject}>
            Rejeitar
          </PrimaryButton>
        </div>
      </div>
    </article>
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
