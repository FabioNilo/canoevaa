import { NextResponse } from "next/server";
import { z } from "zod";
import { membershipRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

const adjustQuotaSchema = z.object({
  amount: z.number().int().refine((value) => value !== 0, "Informe um valor diferente de zero."),
  reason: z.string().min(3),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const { id } = await params;
  const parsed = adjustQuotaSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INVALID_QUOTA_ADJUSTMENT", message: "Revise o ajuste de cotas." },
        meta: { issues: parsed.error.issues },
      },
      { status: 400 },
    );
  }

  const response = await membershipRepository.adjustQuota(id, parsed.data);
  return NextResponse.json(response, { status: response.error ? 400 : 200 });
}
