export type PaymentStatus =
  | "CREATED"
  | "PAYER_ACTION_REQUIRED"
  | "CAPTURE_PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "DECLINED"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"
  | "REQUIRES_RECONCILIATION";

export type PaymentProvider = "PAYPAL" | "SIMULATED";

export interface CreateOrderInput {
  planId: string;
  approvalId: string;
  amountMinor: number;
  currency: string;
  itemTitle: string;
  quantity: number;
  returnUrl?: string;
  cancelUrl?: string;
  idempotencyKey: string;
  simulated?: boolean;
}

export interface CreateOrderResult {
  paymentId: string;
  providerOrderId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  approveUrl?: string;
  amountMinor: number;
  currency: string;
}

export interface CaptureOrderInput {
  paymentId: string;
  providerOrderId: string;
  expectedAmountMinor: number;
  expectedCurrency: string;
  idempotencyKey: string;
  simulated?: boolean;
}

export interface CaptureOrderResult {
  paymentId: string;
  providerOrderId: string;
  providerCaptureId: string;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  reconciled: boolean;
  capturedAt: Date;
}

export interface WebhookVerificationInput {
  headers: Record<string, string | null | undefined>;
  rawBody: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  eventId: string;
  eventType: string;
  resource: Record<string, unknown>;
  error?: string;
}

export interface PaymentRecord {
  id: string;
  planId: string;
  approvalId: string;
  provider: PaymentProvider;
  providerOrderId: string | null;
  providerCaptureId: string | null;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  failureCode?: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
