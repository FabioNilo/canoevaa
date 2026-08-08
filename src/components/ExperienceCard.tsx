import { ArrowRight, CheckCircle2, Clock, Waves } from "lucide-react";
import Link from "next/link";
import type { Experience } from "@/data/experiencias";

type Props = {
  experience: Experience;
  linked?: boolean;
  selected?: boolean;
};

export function ExperienceCard({ experience, linked = true, selected = false }: Props) {
  const content = (
    <>
      <div className="mb-auto flex items-center justify-between">
        <span className="rounded-full bg-sand px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-deep">
          {experience.dificuldade}
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/18 backdrop-blur">
          {selected ? <CheckCircle2 size={18} /> : <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />}
        </span>
      </div>
      <h3 className="font-display text-2xl font-bold">{experience.nome}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/90">{experience.descricao}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/16 px-3 py-1 backdrop-blur">
          <Clock size={14} /> {experience.duracao}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/16 px-3 py-1 backdrop-blur">
          <Waves size={14} /> {experience.cotas} cota{experience.cotas > 1 ? "s" : ""}
        </span>
      </div>
    </>
  );

  const className = `group flex min-h-72 flex-col justify-end overflow-hidden rounded-2xl bg-cover bg-center p-5 text-white deep-shadow transition ${linked ? "hover:-translate-y-1" : ""} ${experience.imagemClasse}`;

  if (!linked) {
    return <article className={className}>{content}</article>;
  }

  return (
    <Link href={`/experiencias/${experience.slug}`} className={className}>
      {content}
    </Link>
  );
}
