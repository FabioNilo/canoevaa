import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

const canoeSchema = z.object({
  name: z.string().min(2),
  capacity: z.number().int().min(1).max(25),
  isActive: z.boolean(),
});

export async function GET() {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  return NextResponse.json(await adminRepository.canoes());
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const parsed = canoeSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_CANOE",
          message: "Revise os dados da canoa.",
        },
        meta: { issues: parsed.error.issues },
      },
      { status: 400 },
    );
  }

  const response = await adminRepository.createCanoe(parsed.data);
  return NextResponse.json(response, { status: response.error ? 400 : 201 });
}
