import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/server/payments";

export async function POST(request: Request) {
  const provider = getPaymentProvider();
  const event = await provider.handleWebhook(await request.json());

  if (!event.providerPaymentId) {
    return NextResponse.json(
      { data: null, error: { code: "PAYMENT_ID_REQUIRED", message: "Informe o identificador do pagamento." } },
      { status: 400 },
    );
  }

  if (!prisma) {
    return NextResponse.json({
      data: { providerPaymentId: event.providerPaymentId, status: event.status },
      error: null,
      meta: { source: "mock" },
    });
  }

  const payment = await prisma.payment.update({
    where: { providerPaymentId: event.providerPaymentId },
    data: {
      status: event.status === "paid" ? "PAID" : "PENDING",
      paidAt: event.status === "paid" ? new Date() : null,
      reservation: event.status === "paid" ? { update: { status: "CONFIRMED" } } : undefined,
    },
    include: { reservation: true },
  });

  await prisma.auditLog.create({
    data: {
      action: "payment.webhook_mock",
      entityType: "Payment",
      entityId: payment.id,
      metadata: { providerPaymentId: event.providerPaymentId, status: event.status },
    },
  });

  return NextResponse.json({
    data: { providerPaymentId: payment.providerPaymentId, status: payment.status },
    error: null,
    meta: { source: "postgres" },
  });
}
