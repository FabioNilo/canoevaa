"use client";

import { ArrowLeft, BadgeCheck, LayoutDashboard, UsersRound, WalletCards, Waves } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";

type AdminNavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const adminNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/passeios", label: "Passeios", icon: Waves },
  { href: "/admin/participantes", label: "Participantes", icon: UsersRound },
  { href: "/admin/associados", label: "Associados", icon: BadgeCheck },
  { href: "/admin/caixa", label: "Caixa", icon: WalletCards },
];

function isActivePath(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-surface text-deep">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-line bg-white/84 px-5 py-6 lg:block">
          <div className="sticky top-6">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-ocean">
              <ArrowLeft size={18} />
              Voltar ao site
            </Link>
            <div className="mt-8">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Administração</p>
              <h1 className="mt-2 font-display text-2xl font-bold text-deep">Painel operacional</h1>
            </div>
            <nav className="mt-8 space-y-2" aria-label="Navegacao administrativa">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${
                      active ? "bg-ocean text-white shadow-lg shadow-[#0077be]/16" : "text-muted hover:bg-surface hover:text-deep"
                    }`}
                  >
                    <Icon size={19} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" aria-label="Voltar ao site" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-deep">
                <ArrowLeft size={17} />
              </Link>
              <p className="min-w-0 truncate font-display text-lg font-bold text-deep">Admin</p>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Navegacao administrativa">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition ${
                      active ? "bg-ocean text-white" : "bg-white text-muted"
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
