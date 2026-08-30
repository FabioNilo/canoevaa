import { EmptyState } from "@/components/admin/ui";
import { adminRepository, membershipRepository } from "@/server/repositories";
import { AssociadosClient } from "./AssociadosClient";

export default async function AdminAssociadosPage() {
  const [memberships, plans, customers] = await Promise.all([
    membershipRepository.list(),
    membershipRepository.plans(),
    adminRepository.customers(),
  ]);

  if (!memberships.data || !plans.data || !customers.data) {
    return (
      <EmptyState
        title="Associados indisponiveis"
        description={
          memberships.error?.message ??
          plans.error?.message ??
          customers.error?.message ??
          "Nao foi possivel carregar os associados."
        }
      />
    );
  }

  return (
    <AssociadosClient
      initialMemberships={memberships.data}
      plans={plans.data}
      customers={customers.data}
    />
  );
}
