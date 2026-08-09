import { CalendarDays, Menu, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "./PrimaryButton";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-white/60 backdrop-blur-xl">
      <nav className="mx-auto flex h-[92px] max-w-[1440px] items-center justify-between px-5 sm:px-10 lg:px-20">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/ilheus-canoe-vaa-logo.png"
            alt="Logo ILHÉUS CANOE VA'A"
            width={56}
            height={56}
            priority
            className="h-12 w-12 rounded-full object-cover"
          />
          <span className="hidden font-display text-lg font-bold uppercase tracking-[0.14em] text-deep sm:block">
            ILHÉUS CANOE VA&apos;A
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="/experiencias/por-do-sol" className="border-b-2 border-turquoise pb-1 text-sm font-bold text-turquoise">
            Experiências
          </Link>
          <Link href="/reserva" className="text-sm font-semibold text-muted hover:text-ocean">
            Como funciona
          </Link>
          <Link href="/associado/login" className="text-sm font-semibold text-muted hover:text-ocean">
           Área do associado
          </Link>
          <Link href="/admin" className="text-sm font-semibold text-muted hover:text-ocean">
            Admin
          </Link>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ButtonLink href="/reserva" className="px-8">
            <CalendarDays size={18} />
            Reservar uma remada
          </ButtonLink>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/associado/login"
            aria-label="Área do associado"
            className="grid h-10 w-10 place-items-center rounded-full text-deep"
          >
            <UserRound size={21} />
          </Link>
          <Link href="/reserva" aria-label="Reservar" className="grid h-10 w-10 place-items-center rounded-full text-deep">
            <CalendarDays size={21} />
          </Link>
          <button aria-label="Abrir menu" className="grid h-10 w-10 place-items-center rounded-full text-deep">
            <Menu size={22} />
          </button>
        </div>
      </nav>
    </header>
  );
}


