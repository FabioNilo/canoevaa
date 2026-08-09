import { NextResponse } from "next/server";
import { adminRepository } from "@/server/repositories";

export function GET() {
  return NextResponse.json(adminRepository.overview());
}
