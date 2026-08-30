import { NextResponse } from "next/server";
import { z } from "zod";
import { membershipRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

const membershipCustomerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  birthDate: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

const createMembershipSchema = z
  .object({
    planId: z.string().min(1),
    startedAt: z.string().min(1).optional(),
    customerId: z.string().min(1).optional(),
    customer: membershipCustomerSchema.optional(),
  })
  .refine((value) => Boolean(value.customerId) !== Boolean(value.customer), {
    message: "Informe um cliente existente ou os dados de um novo cadastro.",
    path: ["customer"],
  });

export async function GET() {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  return NextResponse.json(await membershipRepository.list());
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const parsed = createMembershipSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "INVALID_MEMBERSHIP", message: "Revise os dados da associacao." },
        meta: { issues: parsed.error.issues },
      },
      { status: 400 },
    );
  }

  const response = await membershipRepository.create(parsed.data);
  return NextResponse.json(response, { status: response.error ? 400 : 201 });
}
