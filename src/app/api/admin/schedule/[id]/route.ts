import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

const scheduleSlotCanoeSchema = z.object({
  canoeId: z.string().min(1),
  capacity: z.number().int().min(1).max(25),
});

const updateScheduleSlotSchema = z.object({
  status: z.enum(["open", "blocked", "cancelled"]).optional(),
  date: z.string().min(10).optional(),
  time: z.string().min(4).optional(),
  capacityTotal: z.number().int().min(1).max(25).optional(),
  canoes: z.array(scheduleSlotCanoeSchema).max(2).optional(),
  blockedReason: z.string().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  meetingPointOverride: z.string().nullable().optional(),
  priceOverrideCents: z.number().int().min(0).nullable().optional(),
  bookingCutoffAt: z.string().nullable().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const { id } = await params;
  const parsed = updateScheduleSlotSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_SCHEDULE_UPDATE",
          message: "Revise a alteração do horário.",
        },
        meta: { issues: parsed.error.issues },
      },
      { status: 400 },
    );
  }

  const response = await adminRepository.updateScheduleSlot(id, parsed.data);
  return NextResponse.json(response, { status: response.error ? 404 : 200 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const { id } = await params;
  const response = await adminRepository.deleteScheduleSlot(id);
  return NextResponse.json(response, { status: response.error ? 400 : 200 });
}
