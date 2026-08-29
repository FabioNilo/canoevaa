import type { CreateChargeInput, PaymentProvider } from "./types";

export class MockPaymentProvider implements PaymentProvider {
  async createCharge(input: CreateChargeInput) {
    const providerPaymentId = `mock_${input.code.toLowerCase()}`;

    return {
      provider: "mock",
      providerPaymentId,
      pixCopyPaste: `00020101021226880014br.gov.bcb.pix.mock520400005303986540${(input.amountCents / 100)
        .toFixed(2)
        .replace(".", "")}5802BR5920ILHEUS CANOE VAA6210${input.code}`,
      pixQrCodeUrl: `/api/payments/webhook/mock?paymentId=${providerPaymentId}`,
      expiresAt: input.expiresAt,
    };
  }

  async getChargeStatus() {
    return "pending" as const;
  }

  async handleWebhook(payload: unknown): ReturnType<PaymentProvider["handleWebhook"]> {
    const body = payload as { providerPaymentId?: string; paymentId?: string; status?: string };
    const status: Awaited<ReturnType<PaymentProvider["handleWebhook"]>>["status"] =
      body.status === "paid" ? "paid" : "pending";

    return {
      providerPaymentId: body.providerPaymentId ?? body.paymentId ?? "",
      status,
    };
  }

  async refund() {
    return { status: "pending" as const };
  }
}
