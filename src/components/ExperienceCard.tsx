import { ArrowRight, CheckCircle2, Clock, Waves } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { centsToCurrency } from "@/domain/rules";
import type { Experience } from "@/domain/types";

type Props = {
  experience: Experience;
  linked?: boolean;
  selected?: boolean;
  priority?: boolean;
};

export function ExperienceCard({ experience, linked = true, selected = false, priority = false }: Props) {
  const coverImage = experience.galleryImages[0];
  const imageCount = experience.galleryImages.length;
  const media = (
    <>
      {coverImage ? (
        <Image
          src={coverImage.src}
          alt={coverImage.alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          quality={92}
          priority={priority}
          className="absolute inset-0 -z-20 object-cover transition duration-700 ease-out group-hover:scale-105"
          style={{ objectPosition: coverImage.objectPosition ?? "center" }}
        />
      ) : (
        <span className={`absolute inset-0 -z-20 bg-cover bg-center ${experience.imageClass}`} />
      )}
      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-deep/92 via-deep/28 to-deep/8" />
      <span className="absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-deep/28 to-transparent" />
    </>
  );

  const content = (
    <>
      <div className="mb-auto flex items-center justify-between">
        <span className="rounded-full bg-sand px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-deep">
          {experience.difficulty}
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/18 backdrop-blur">
          {selected ? <CheckCircle2 size={18} /> : <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />}
        </span>
      </div>
      {imageCount > 1 ? (
        <span className="mb-3 w-fit rounded-full bg-white/16 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          {imageCount} fotos
        </span>
      ) : null}
      <h3 className="font-display text-2xl font-bold">{experience.name}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/90">{experience.shortDescription}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/16 px-3 py-1 backdrop-blur">
          <Clock size={14} /> {experience.scheduleLabel}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/16 px-3 py-1 backdrop-blur">
          <Waves size={14} /> {centsToCurrency(experience.priceCents)}
        </span>
      </div>
    </>
  );

  const className = `group relative isolate flex aspect-[4/5] min-h-80 flex-col justify-end overflow-hidden rounded-[24px] bg-deep p-5 text-white deep-shadow transition sm:aspect-[4/3] lg:aspect-[5/4] ${linked ? "hover:-translate-y-1" : ""}`;

  if (!linked) {
    return (
      <article className={className}>
        {media}
        {content}
      </article>
    );
  }

  return (
    <Link href={`/experiencias/${experience.slug}`} className={className}>
      {media}
      {content}
    </Link>
  );
}
