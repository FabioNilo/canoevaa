import { NextResponse } from "next/server";
import { experienceRepository } from "@/server/repositories";

export function GET() {
  return NextResponse.json(experienceRepository.list());
}
