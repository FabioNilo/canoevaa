import { MockPaymentProvider } from "./mock-provider";
import type { PaymentProvider } from "./types";

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "mock";

  if (provider !== "mock") {
    throw new Error(`Payment provider "${provider}" ainda não foi implementado.`);
  }

  return new MockPaymentProvider();
}
