import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { ReactNode } from "react";
import { authOptions } from "@/auth";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default async function AdminRouteLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "admin") {
    redirect("/associado/login?next=/admin");
  }

  return <AdminLayout>{children}</AdminLayout>;
}
