import { NextResponse } from "next/server";
import { availabilityRepository } from "@/server/repositories";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json(await availabilityRepository.list(searchParams.get("experienceSlug") ?? undefined));
}
