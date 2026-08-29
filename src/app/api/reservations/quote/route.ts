import { NextResponse } from "next/server";
import { reservationRepository } from "@/server/repositories";

export async function POST(request: Request) {
  const body = (await request.json()) as { experienceSlug?: string; participantsCount?: number };

  if (!body.experienceSlug || typeof body.participantsCount !== "number") {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_QUOTE_INPUT",
          message: "Informe experiência e quantidade de participantes.",
        },
      },
      { status: 400 },
    );
  }

  const response = await reservationRepository.quote({
    experienceSlug: body.experienceSlug,
    participantsCount: body.participantsCount,
  });

  return NextResponse.json(response, { status: response.error ? 400 : 200 });
}
