import { NextResponse } from "next/server";
import type { ReservationStatus } from "@/domain/types";
import { adminRepository } from "@/server/repositories";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { status?: ReservationStatus };

  if (!body.status) {
    return NextResponse.json(
      { data: null, error: { code: "STATUS_REQUIRED", message: "Informe o novo status." } },
      { status: 400 },
    );
  }

  const response = adminRepository.updateReservationStatus(id, body.status);
  return NextResponse.json(response, { status: response.error ? 404 : 200 });
}
