import { NextResponse } from "next/server";
import { adminRepository } from "@/server/repositories";
import { requireAdminResponse } from "@/server/session";

export async function GET(request: Request) {
  const unauthorized = await requireAdminResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const startDate = searchParams.get("startDate");

  if (mode || startDate) {
    return NextResponse.json(await adminRepository.dashboard({ mode, startDate }));
  }

  return NextResponse.json(await adminRepository.overview());
}
