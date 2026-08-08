import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { ButtonLink } from "@/components/PrimaryButton";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-deep">
        <section className="hero-ocean flex min-h-[calc(100vh-188px)] items-center justify-center bg-cover bg-center px-5 pb-20 pt-32 text-white sm:px-8 lg:px-16">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <Image
              src="/brand/ilheus-canoe-vaa-logo.png"
              alt="Logo ILHÉUS CANOE VA'A"
              width={128}
              height={128}
              priority
              className="mb-8 h-24 w-24 rounded-full object-cover shadow-2xl shadow-deep/40 sm:h-32 sm:w-32"
            />

            <h1 className="font-display text-4xl font-bold leading-tight drop-shadow-xl sm:text-5xl lg:text-6xl">
              Descubra Ilheus de um jeito diferente
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-white/92 sm:text-xl">
              Experiencias de canoa havaiana que unem mar, natureza, movimento e boas historias.
            </p>

            <div className="mt-10 flex w-full max-w-xl flex-col gap-4 sm:flex-row sm:justify-center">
              <ButtonLink href="/reserva" className="w-full px-10 py-4 text-base sm:w-auto">
                Quero remar
              </ButtonLink>
              <ButtonLink
                href="/experiencias/por-do-sol"
                variant="secondary"
                className="w-full border-2 bg-white/8 px-10 py-4 text-base text-white backdrop-blur sm:w-auto"
              >
                Conhecer experiencias
              </ButtonLink>
            </div>

            <a href="/reserva" className="mt-16 flex flex-col items-center gap-4 text-white">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.18em]">
                Experiencias a partir de R$ 35 por pessoa
              </span>
              <ChevronDown size={28} />
            </a>
          </div>
        </section>

        <footer className="bg-deep px-5 py-9 text-white sm:px-10 lg:px-20">
          <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-7 text-center md:flex-row md:justify-between md:text-left">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/ilheus-canoe-vaa-logo.png"
                alt="Logo ILHÉUS CANOE VA'A"
                width={48}
                height={48}
                className="h-11 w-11 rounded-full object-cover"
              />
              <p className="font-display text-xl font-bold">ILHÉUS CANOE VA&apos;A</p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-white/76">
              <a href="#">Privacidade</a>
              <a href="#">Termos</a>
              <a href="#">Cancelamento</a>
            </div>
            <p className="text-sm text-white/76">© 2026 ILHÉUS CANOE VA&apos;A. Todos os direitos reservados.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
