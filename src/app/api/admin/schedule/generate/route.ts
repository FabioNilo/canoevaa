import { NextResponse } from "next/server";
import { z } from "zod";
import { adminRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

const scheduleSlotCanoeSchema = z.object({
  canoeId: z.string().min(1),
  capacity: z.number().int().min(1).max(25),
});

const generateScheduleSchema = z.object({
  experienceSlug: z.string().min(1),
  startDate: z.string().min(10),
  daysAhead: z.number().int().min(1).max(120),
  canoes: z.array(scheduleSlotCanoeSchema).max(2).optional(),
});

export async function POST(request: Request) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const parsed = generateScheduleSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_SCHEDULE_GENERATION",
          message: "Revise os dados para gerar a agenda.",
        },
        meta: { issues: parsed.error.issues },
      },
      { status: 400 },
    );
  }

  const response = await adminRepository.generateSchedule(parsed.data);
  return NextResponse.json(response, { status: response.error ? 400 : 201 });
}
