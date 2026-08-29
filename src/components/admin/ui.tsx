import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-deep sm:text-4xl">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function MetricCard({ label, value, detail, icon }: { label: string; value: ReactNode; detail?: string; icon: ReactNode }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-5 deep-shadow">
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-turquoise/14 text-deep">{icon}</span>
        <p className="break-words text-right font-display text-3xl font-bold text-deep">{value}</p>
      </div>
      <p className="mt-4 font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      {detail ? <p className="mt-1 text-sm text-muted">{detail}</p> : null}
    </article>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral" }) {
  const styles = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    info: "bg-ocean/10 text-ocean",
    neutral: "bg-line text-muted",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[tone]}`}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-5 text-center">
      <p className="font-display text-lg font-bold text-deep">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}
