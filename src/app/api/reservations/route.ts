import { NextResponse } from "next/server";
import type { ReservationDraft } from "@/domain/types";
import { reservationRepository } from "@/server/repositories";

export async function POST(request: Request) {
  const draft = (await request.json()) as ReservationDraft;
  const response = reservationRepository.create(draft);

  return NextResponse.json(response, { status: response.error ? 400 : 201 });
}
