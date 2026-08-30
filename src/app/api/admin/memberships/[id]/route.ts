import { NextResponse } from "next/server";
import { z } from "zod";
import { membershipRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

const membershipCustomerPatchSchema = z
  .object({
    name: z.string().min(2),
    phone: z.string().min(8),
    email: z.string(),
    cpf: z.string(),
    rg: z.string(),
    birthDate: z.string(),
    addressLine: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
  })
  .partial();

const updateMembershipSchema = z
  .object({
    status: z.enum(["active", "past_due", "suspended", "cancelled"]).optional(),
    planId: z.string().min(1).optional(),
    startedAt: z.string().min(1).optional(),
    customer: membershipCustomerPatchSchema.optional(),
  })
  .refine(
    (value) => Boolean(value.status || value.planId || value.startedAt || value.customer),
    { message: "Nada para atualizar." },
  );

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const { id } = await params;
  const response = await membershipRepository.detail(id);
  return NextResponse.json(response, { status: response.error ? 404 : 200 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const { id } = await params;
  const parsed = updateMembershipSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INVALID_MEMBERSHIP_UPDATE", message: "Revise a alteracao da associacao." },
        meta: { issues: parsed.error.issues },
      },
      { status: 400 },
    );
  }

  const response = await membershipRepository.update(id, parsed.data);
  return NextResponse.json(response, { status: response.error ? 400 : 200 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const { id } = await params;
  const response = await membershipRepository.remove(id);
  return NextResponse.json(response, { status: response.error ? 400 : 200 });
}
