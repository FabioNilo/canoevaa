import { NextResponse } from "next/server";
import { memberRepository } from "@/server/repositories";
import { getCurrentSessionUser, requireMemberResponse } from "@/server/session";

export async function GET() {
  const unauthorized = await requireMemberResponse();

  if (unauthorized) {
    return NextResponse.json(unauthorized, { status: 401 });
  }

  const user = await getCurrentSessionUser();
  const response = await memberRepository.dashboard(user?.id ?? "");
  return NextResponse.json(response, { status: response.error ? 404 : 200 });
}
