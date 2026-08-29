import { EmptyState } from "@/components/admin/ui";
import { adminRepository } from "@/server/repositories";
import { PasseiosClient } from "./PasseiosClient";

export default async function AdminPasseiosPage() {
  const [experiences, canoes, schedule] = await Promise.all([
    adminRepository.experiences(),
    adminRepository.canoes(),
    adminRepository.schedule(),
  ]);

  if (!experiences.data || !canoes.data || !schedule.data) {
    return (
      <EmptyState
        title="Passeios indisponiveis"
        description={experiences.error?.message ?? canoes.error?.message ?? schedule.error?.message ?? "Nao foi possivel carregar os dados."}
      />
    );
  }

  return (
    <PasseiosClient
      initialExperiences={experiences.data}
      initialCanoes={canoes.data}
      initialSchedule={schedule.data}
    />
  );
}
