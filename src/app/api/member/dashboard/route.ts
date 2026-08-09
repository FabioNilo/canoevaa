import { NextResponse } from "next/server";
import { memberRepository } from "@/server/repositories";

export function GET() {
  return NextResponse.json(memberRepository.dashboard());
}
