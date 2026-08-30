import { NextResponse } from "next/server";
import { membershipRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

export async function POST() {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  return NextResponse.json(await membershipRepository.renewDuePeriods());
}
