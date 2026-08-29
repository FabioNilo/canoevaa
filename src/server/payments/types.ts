export type CreateChargeInput = {
  reservationId: string;
  code: string;
  customerName: string;
  customerEmail?: string;
  amountCents: number;
  expiresAt: Date;
};

export type PaymentCharge = {
  provider: string;
  providerPaymentId: string;
  pixCopyPaste: string;
  pixQrCodeUrl?: string;
  expiresAt: Date;
};

export type PaymentProvider = {
  createCharge(input: CreateChargeInput): Promise<PaymentCharge>;
  getChargeStatus(providerPaymentId: string): Promise<"pending" | "paid" | "expired" | "refunded" | "cancelled">;
  handleWebhook(payload: unknown): Promise<{ providerPaymentId: string; status: "pending" | "paid" | "expired" | "refunded" | "cancelled" }>;
  refund(providerPaymentId: string, amountCents: number): Promise<{ status: "pending" | "refunded" }>;
};
