import { NextResponse } from "next/server";
import { memberRepository } from "@/server/repositories";

export async function GET() {
  return NextResponse.json(await memberRepository.dashboard());
}
