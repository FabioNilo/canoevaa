import { NextResponse } from "next/server";
import { z } from "zod";
import { reservationRepository } from "@/server/repositories";
import { getCurrentSessionUser } from "@/server/session";

const participantSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(2),
  rg: z.string().min(3),
  phone: z.string().optional(),
  termsAccepted: z.boolean(),
});

const reservationSchema = z.object({
  experienceSlug: z.string().min(1),
  scheduleSlotId: z.string().optional(),
  date: z.string().min(10),
  time: z.string().min(4),
  participantsCount: z.literal(1),
  useMemberQuota: z.boolean().optional(),
  customer: z.object({
    fullName: z.string().min(2),
    rg: z.string().min(3),
    phone: z.string().min(8),
    email: z.string().email().optional().or(z.literal("")),
    cpf: z.string().optional(),
    birthDate: z.string().optional(),
    address: z.string().optional(),
    willParticipate: z.boolean().optional(),
  }),
  participants: z.array(participantSchema).length(1),
  paymentMethod: z.enum(["pix", "card", "in_person"]),
  acceptedTermsVersion: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = reservationSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_RESERVATION",
          message: "Revise os dados da reserva.",
        },
        meta: { issues: parsed.error.issues },
      },
      { status: 400 },
    );
  }

  const user = await getCurrentSessionUser();

  if (parsed.data.useMemberQuota && user?.role !== "member") {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "Entre como associado para usar suas cotas.",
        },
      },
      { status: 401 },
    );
  }

  const response = await reservationRepository.create(parsed.data, {
    memberUserId: parsed.data.useMemberQuota && user?.role === "member" ? user.id : undefined,
  });

  return NextResponse.json(response, { status: response.error ? 400 : 201 });
}
