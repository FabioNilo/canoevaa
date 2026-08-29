import { NextResponse } from "next/server";
import { experienceRepository } from "@/server/repositories";

export async function GET() {
  try {
    return NextResponse.json(await experienceRepository.list());
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "EXPERIENCES_FAILED",
          message: error instanceof Error ? error.message : "Não foi possível carregar experiências.",
        },
      },
      { status: 500 },
    );
  }
}
