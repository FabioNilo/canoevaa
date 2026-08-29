import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

const experienceSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  kind: z.enum(["regular", "celebration", "expedition"]),
  shortDescription: z.string().min(3),
  description: z.string().min(3),
  priceCents: z.number().int().min(0),
  durationMinutes: z.number().int().min(15),
  scheduleLabel: z.string().min(2),
  scheduleMode: z.enum(["daily_default", "manual"]),
  meetingPoint: z.string().min(2),
  difficulty: z.enum(["iniciante", "intermediario", "avancado"]),
  quotaCost: z.number().int().min(0),
  imageClass: z.string().min(1),
  availableTimes: z.array(z.string().min(4)),
  includedItems: z.array(z.string()),
  guidance: z.array(z.string()),
  safetyNotes: z.array(z.string()),
  minParticipants: z.number().int().min(1),
  maxParticipants: z.number().int().min(1).max(25),
  isActive: z.boolean(),
});

export async function GET() {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  return NextResponse.json(await adminRepository.experiences());
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const parsed = experienceSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_EXPERIENCE",
          message: "Revise os dados do passeio.",
        },
        meta: { issues: parsed.error.issues },
      },
      { status: 400 },
    );
  }

  const response = await adminRepository.createExperience(parsed.data);
  return NextResponse.json(response, { status: response.error ? 400 : 201 });
}
