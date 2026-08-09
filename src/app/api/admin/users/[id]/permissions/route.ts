import { NextResponse } from "next/server";
import type { AdminPermission } from "@/domain/types";
import { adminRepository } from "@/server/repositories";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { permissions?: Partial<Record<AdminPermission, boolean>> };

  if (!body.permissions) {
    return NextResponse.json(
      { data: null, error: { code: "PERMISSIONS_REQUIRED", message: "Informe as permissões." } },
      { status: 400 },
    );
  }

  const response = adminRepository.updateUserPermissions(id, body.permissions);
  return NextResponse.json(response, { status: response.error ? 404 : 200 });
}
