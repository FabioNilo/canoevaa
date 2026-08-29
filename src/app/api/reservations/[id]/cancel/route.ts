import { NextResponse } from "next/server";
import { z } from "zod";
import { reservationRepository } from "@/server/repositories";

const cancelSchema = z.object({
  reason: z.string().min(3).default("Solicitação do cliente"),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = cancelSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_CANCELLATION",
          message: "Informe o motivo do cancelamento.",
        },
        meta: { issues: parsed.error.issues },
      },
      { status: 400 },
    );
  }

  try {
    const response = await reservationRepository.cancel(id, parsed.data.reason);
    return NextResponse.json(response, { status: response.error ? 404 : 200 });
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "CANCELLATION_FAILED",
          message: error instanceof Error ? error.message : "Não foi possível cancelar a reserva.",
        },
      },
      { status: 400 },
    );
  }
}
