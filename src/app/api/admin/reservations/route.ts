import { NextResponse } from "next/server";
import { adminRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

export async function GET() {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  return NextResponse.json(await adminRepository.reservations());
}
