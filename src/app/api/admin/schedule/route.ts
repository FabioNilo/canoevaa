import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

const scheduleSlotCanoeSchema = z.object({
  canoeId: z.string().min(1),
  capacity: z.number().int().min(1).max(25),
});

const createScheduleSlotSchema = z.object({
  experienceSlug: z.string().min(1),
  date: z.string().min(10),
  time: z.string().min(4),
  capacityTotal: z.number().int().min(1).max(25).optional(),
  canoeId: z.string().optional(),
  canoes: z.array(scheduleSlotCanoeSchema).max(2).optional(),
  blockedReason: z.string().optional(),
  adminNotes: z.string().optional(),
  meetingPointOverride: z.string().optional(),
  priceOverrideCents: z.number().int().min(0).optional(),
  bookingCutoffAt: z.string().optional(),
});

export async function GET() {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  return NextResponse.json(await adminRepository.schedule());
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const parsed = createScheduleSlotSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_SCHEDULE_SLOT",
          message: "Revise os dados do horário.",
        },
        meta: { issues: parsed.error.issues },
      },
      { status: 400 },
    );
  }

  const response = await adminRepository.createScheduleSlot(parsed.data);
  return NextResponse.json(response, { status: response.error ? 400 : 201 });
}
