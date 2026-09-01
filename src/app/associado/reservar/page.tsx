import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import ReservaPage from "@/app/reserva/page";

export default async function AssociadoReservarPage() {
  const session = await getServerSession(authOptions);

  if (session?.user.role !== "member") {
    redirect("/associado/login?next=/associado/reservar");
  }

  return <ReservaPage memberMode />;
}
