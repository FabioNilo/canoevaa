import { RefreshCcw, ShieldCheck, Waves } from "lucide-react";
import type { MemberDashboard } from "@/domain/types";

export function QuotaCard({ dashboard }: { dashboard: MemberDashboard }) {
  return (
    <section className="overflow-hidden rounded-[28px] bg-deep text-white deep-shadow">
      <div className="canoe-sunrise bg-cover bg-center p-6 sm:p-8">
        <span className="inline-flex rounded-full bg-sand px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-deep">
          Suas cotas desta semana
        </span>

        <div className="mt-8 flex items-center gap-3">
          {Array.from({ length: dashboard.plan.weeklyQuota }).map((_, index) => (
            <span
              key={index}
              className={`h-8 w-8 rounded-full ${index < dashboard.quotasAvailable ? "bg-turquoise" : "border border-white/60"}`}
            />
          ))}
        </div>

        <div className="mt-6 font-display text-5xl font-bold leading-tight">
          {dashboard.quotasAvailable} de {dashboard.plan.weeklyQuota}
          <br />
          disponíveis
        </div>

        <div className="mt-8 space-y-4 text-lg font-semibold">
          <p className="flex items-center gap-3">
            <Waves className="text-turquoise" /> Remada = 1 cota
          </p>
          <p className="flex items-center gap-3">
            <ShieldCheck className="text-sand" /> Nascer do Sol = 2 cotas
          </p>
          <p className="flex items-center gap-3 text-white/82">
            <RefreshCcw size={20} /> Próxima renovação: {dashboard.member.nextRenewalLabel}
          </p>
        </div>
      </div>
    </section>
  );
}
