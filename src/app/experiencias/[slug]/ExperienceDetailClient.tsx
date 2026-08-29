"use client";

import { ArrowLeft, Clock, MapPin, ShieldCheck, UsersRound, Waves } from "lucide-react";
import Link from "next/link";
import { ExperienceCarousel } from "@/components/ExperienceCarousel";
import { ButtonLink } from "@/components/PrimaryButton";
import { centsToCurrency, getExperienceBookingPolicy } from "@/domain/rules";
import type { Experience } from "@/domain/types";

export default function ExperienceDetailClient({
  initialExperience,
  initialError,
}: {
  initialExperience: Experience | null;
  initialError: string | null;
}) {
  if (initialError || !initialExperience) {
    return <main className="min-h-screen bg-surface px-4 py-10 text-danger">{initialError ?? "Experiência não encontrada."}</main>;
  }

  const experience = initialExperience;
  const bookingPolicy = getExperienceBookingPolicy(experience);

  return (
    <main className="min-h-screen bg-surface pb-12">
      <section
        className={`relative min-h-[72svh] overflow-hidden bg-cover bg-center px-4 py-6 text-white sm:min-h-[68vh] lg:min-h-[76vh] ${
          experience.galleryImages.length > 0 ? "" : experience.imageClass
        }`}
      >
        {experience.galleryImages.length > 0 ? <ExperienceCarousel images={experience.galleryImages} /> : null}

        <Link
          href="/"
          aria-label="Voltar"
          className="relative z-10 grid h-11 w-11 place-items-center rounded-full bg-white/18 backdrop-blur transition hover:bg-white/28"
        >
          <ArrowLeft size={21} />
        </Link>

        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-10 sm:pb-12">
          <div className="mx-auto max-w-4xl">
            <span className="rounded-full bg-sand px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-deep">
              {experience.difficulty}
            </span>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight drop-shadow-lg sm:text-5xl lg:text-6xl">
              {experience.name}
            </h1>
            <p className="mt-3 max-w-xl text-lg leading-8 text-white/90">{experience.shortDescription}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-6 px-4 py-8 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="font-display text-2xl font-bold text-deep">Sobre a experiência</h2>
          <p className="mt-3 leading-8 text-muted">{experience.description}</p>

          <h2 className="mt-8 font-display text-2xl font-bold text-deep">O que está incluso</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {experience.includedItems.map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4">
                <ShieldCheck className="text-success" size={21} />
                <span className="font-semibold text-deep">{item}</span>
              </div>
            ))}
          </div>

          <h2 className="mt-8 font-display text-2xl font-bold text-deep">Orientações e segurança</h2>
          <div className="mt-4 grid gap-3">
            {[...experience.guidance, ...experience.safetyNotes].map((item) => (
              <p key={item} className="rounded-2xl border border-line bg-white p-4 text-muted">
                {item}
              </p>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-line bg-white p-5 deep-shadow">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">Resumo</p>
          <p className="mt-2 font-display text-3xl font-bold text-deep">{centsToCurrency(experience.priceCents)}</p>
          <p className="text-sm text-muted">por pessoa</p>
          <div className="mt-5 space-y-3 text-sm text-muted">
            <p className="flex items-center gap-2">
              <Clock size={18} /> {experience.scheduleLabel}
            </p>
            <p className="flex items-center gap-2">
              <Waves size={18} /> {experience.quotaCost} cota{experience.quotaCost > 1 ? "s" : ""}
            </p>
            <p className="flex items-center gap-2">
              <UsersRound size={18} /> {experience.minParticipants} a {experience.maxParticipants} participantes
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={18} /> {experience.meetingPoint}
            </p>
          </div>
          {bookingPolicy.canReserveOnline ? (
            <ButtonLink href="/reserva" className="mt-6 w-full">
              Reservar essa remada
            </ButtonLink>
          ) : (
            <div className="mt-6 rounded-2xl border border-line bg-surface p-4 text-sm leading-6 text-muted">
              <p className="font-bold text-deep">{bookingPolicy.publicLabel}</p>
              <p className="mt-1">{bookingPolicy.reason}</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
