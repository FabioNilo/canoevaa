import { ChevronDown } from "lucide-react";
import Image from "next/image";
import { ExperienceCard } from "@/components/ExperienceCard";
import { ButtonLink } from "@/components/PrimaryButton";
import { SiteHeader } from "@/components/SiteHeader";
import { experienceRepository } from "@/server/repositories";

export default async function Home() {
  const response = await experienceRepository.list();
  const experiences = response.data ?? [];

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
              Descubra Ilhéus de um jeito diferente
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-white/92 sm:text-xl">
              Experiências de canoa havaiana que unem mar, natureza, movimento e boas histórias.
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
                Conhecer experiências
              </ButtonLink>
            </div>

            <a href="#experiencias" className="mt-16 flex flex-col items-center gap-4 text-white">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.18em]">
                Experiências a partir de R$ 35 por pessoa
              </span>
              <ChevronDown size={28} />
            </a>
          </div>
        </section>

        <section id="experiencias" className="bg-surface px-5 py-16 sm:px-10 lg:px-20">
          <div className="mx-auto max-w-[1440px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-ocean">Experiências</p>
                <h2 className="mt-2 font-display text-4xl font-bold text-deep">Escolha sua remada</h2>
              </div>
              <p className="max-w-xl text-muted">
                Remadas de canoa havaiana em Ilhéus, Bahia, Brasil. Experiências guiadas para todos os níveis de
                habilidade, com duração de 1 a 3 horas, incluindo instruções de segurança e equipamentos.
              </p>
            </div>

            {response.error ? <StateCard text={response.error.message} tone="error" /> : null}
            {!response.error && experiences.length === 0 ? <StateCard text="Nenhuma experiência ativa encontrada." /> : null}

            {!response.error && experiences.length > 0 ? (
              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {experiences.map((experience, index) => (
                  <ExperienceCard key={experience.id} experience={experience} priority={index === 0} />
                ))}
              </div>
            ) : null}
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
              <span>Privacidade</span>
              <span>Termos</span>
              <span>Cancelamento</span>
            </div>
            <p className="text-sm text-white/76">© 2026 ILHÉUS CANOE VA&apos;A. Todos os direitos reservados.</p>
          </div>
        </footer>
      </main>
    </>
  );
}

function StateCard({ text, tone = "neutral" }: { text: string; tone?: "neutral" | "error" }) {
  return (
    <div
      className={`mt-8 rounded-2xl border p-5 ${
        tone === "error" ? "border-danger/30 bg-danger/10 text-danger" : "border-line bg-white text-muted"
      }`}
    >
      {text}
    </div>
  );
}
