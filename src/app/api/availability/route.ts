import { NextResponse } from "next/server";
import { availabilityRepository } from "@/server/repositories";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json(availabilityRepository.list(searchParams.get("experienceSlug") ?? undefined));
}
