import ExperienceDetailClient from "./ExperienceDetailClient";

export default async function ExperiencePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <ExperienceDetailClient slug={slug} />;
}
