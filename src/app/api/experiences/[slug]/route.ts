import { NextResponse } from "next/server";
import { experienceRepository } from "@/server/repositories";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const response = experienceRepository.getBySlug(slug);

  return NextResponse.json(response, { status: response.error ? 404 : 200 });
}
