import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

const updateExperienceSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  kind: z.enum(["regular", "celebration", "expedition"]).optional(),
  shortDescription: z.string().min(3).optional(),
  description: z.string().min(3).optional(),
  priceCents: z.number().int().min(0).optional(),
  durationMinutes: z.number().int().min(15).optional(),
  scheduleLabel: z.string().min(2).optional(),
  scheduleMode: z.enum(["daily_default", "manual"]).optional(),
  meetingPoint: z.string().min(2).optional(),
  difficulty: z.enum(["iniciante", "intermediario", "avancado"]).optional(),
  quotaCost: z.number().int().min(0).optional(),
  imageClass: z.string().min(1).optional(),
  availableTimes: z.array(z.string().min(4)).optional(),
  includedItems: z.array(z.string()).optional(),
  guidance: z.array(z.string()).optional(),
  safetyNotes: z.array(z.string()).optional(),
  minParticipants: z.number().int().min(1).optional(),
  maxParticipants: z.number().int().min(1).max(25).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const { id } = await params;
  const parsed = updateExperienceSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_EXPERIENCE_UPDATE",
          message: "Revise a alteracao do passeio.",
        },
        meta: { issues: parsed.error.issues },
      },
      { status: 400 },
    );
  }

  const response = await adminRepository.updateExperience(id, parsed.data);
  return NextResponse.json(response, { status: response.error ? 400 : 200 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const { id } = await params;
  const response = await adminRepository.deleteExperience(id);
  return NextResponse.json(response, { status: response.error ? 400 : 200 });
}
