import { ArrowLeft, Clock, MapPin, ShieldCheck, UsersRound, Waves } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/PrimaryButton";
import { experiencias } from "@/data/experiencias";

export function generateStaticParams() {
  return experiencias.map((experience) => ({
    slug: experience.slug,
  }));
}

export default async function ExperiencePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const experience = experiencias.find((item) => item.slug === slug);

  if (!experience) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-surface pb-12">
      <section className={`${experience.imagemClasse} relative min-h-[62vh] bg-cover bg-center px-4 py-6 text-white`}>
        <Link
          href="/"
          aria-label="Voltar"
          className="grid h-11 w-11 place-items-center rounded-full bg-white/18 backdrop-blur"
        >
          <ArrowLeft size={21} />
        </Link>

        <div className="absolute inset-x-0 bottom-0 px-4 pb-8">
          <div className="mx-auto max-w-4xl">
            <span className="rounded-full bg-sand px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-deep">
              {experience.dificuldade}
            </span>
            <h1 className="mt-4 font-display text-5xl font-bold">{experience.nome}</h1>
            <p className="mt-3 max-w-xl text-lg leading-8 text-white/90">{experience.descricao}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="font-display text-2xl font-bold text-deep">Sobre a experiencia</h2>
          <p className="mt-3 leading-8 text-muted">{experience.detalhe}</p>

          <h2 className="mt-8 font-display text-2xl font-bold text-deep">O que esta incluido</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {experience.incluso.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
                <ShieldCheck className="text-success" size={21} />
                <span className="font-semibold text-deep">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-white p-5 deep-shadow">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">Resumo</p>
          <p className="mt-2 font-display text-3xl font-bold text-deep">R$ {experience.preco}</p>
          <p className="text-sm text-muted">por pessoa</p>
          <div className="mt-5 space-y-3 text-sm text-muted">
            <p className="flex items-center gap-2">
              <Clock size={18} /> {experience.duracao}
            </p>
            <p className="flex items-center gap-2">
              <Waves size={18} /> {experience.cotas} cotas de associado
            </p>
            <p className="flex items-center gap-2">
              <UsersRound size={18} /> Ate 6 participantes
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={18} /> Praia do Cristo, Ilheus
            </p>
          </div>
          <ButtonLink href="/reserva" className="mt-6 w-full">
            Reservar essa remada
          </ButtonLink>
        </aside>
      </section>
    </main>
  );
}
