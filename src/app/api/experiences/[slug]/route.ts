import { NextResponse } from "next/server";
import { experienceRepository } from "@/server/repositories";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const response = await experienceRepository.getBySlug(slug);

    return NextResponse.json(response, { status: response.error ? 404 : 200 });
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "EXPERIENCE_FAILED",
          message: error instanceof Error ? error.message : "Não foi possível carregar a experiência.",
        },
      },
      { status: 500 },
    );
  }
}
