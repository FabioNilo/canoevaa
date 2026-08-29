import ExperienceDetailClient from "./ExperienceDetailClient";
import { experienceRepository } from "@/server/repositories";

export default async function ExperiencePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const response = await experienceRepository.getBySlug(slug);

  return <ExperienceDetailClient initialExperience={response.data} initialError={response.error?.message ?? null} />;
}
