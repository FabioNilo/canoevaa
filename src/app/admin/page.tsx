import { EmptyState } from "@/components/admin/ui";
import { adminRepository } from "@/server/repositories";
import { AdminDashboardClient } from "./DashboardClient";

export default async function AdminPage() {
  const overview = await adminRepository.dashboard();

  if (!overview.data) {
    return (
      <EmptyState
        title="Dashboard indisponivel"
        description={overview.error?.message ?? "Nao foi possivel carregar os dados administrativos."}
      />
    );
  }

  return <AdminDashboardClient initialDashboard={overview.data} />;
}
