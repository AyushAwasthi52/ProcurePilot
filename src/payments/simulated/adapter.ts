import {
  CaptureOrderInput,
  CaptureOrderResult,
  CreateOrderInput,
  CreateOrderResult,
} from "../types";
import {
  createPayment,
  getPayment,
  getPaymentByIdempotencyKey,
  updatePaymentStatus,
} from "../repository";

export async function createSimulatedOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  // Check idempotency
  const existing = await getPaymentByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    return {
      paymentId: existing.id,
      providerOrderId: existing.providerOrderId || `SIM_ORDER_${existing.id}`,
      provider: "SIMULATED",
      status: existing.status,
      approveUrl: `http://localhost:3000/confirm?orderId=${existing.providerOrderId}&simulated=true`,
      amountMinor: existing.amountMinor,
      currency: existing.currency,
    };
  }

  const simOrderId = `SIM_ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const payment = await createPayment({
    planId: input.planId,
    approvalId: input.approvalId,
    provider: "SIMULATED",
    providerOrderId: simOrderId,
    status: "CREATED",
    amountMinor: input.amountMinor,
    currency: input.currency,
    idempotencyKey: input.idempotencyKey,
  });

  // Advance state to PAYER_ACTION_REQUIRED
  const updated = await updatePaymentStatus(payment.id, "PAYER_ACTION_REQUIRED");

  return {
    paymentId: updated.id,
    providerOrderId: simOrderId,
    provider: "SIMULATED",
    status: updated.status,
    approveUrl: `http://localhost:3000/confirm?orderId=${simOrderId}&simulated=true`,
    amountMinor: updated.amountMinor,
    currency: updated.currency,
  };
}

export async function captureSimulatedOrder(
  input: CaptureOrderInput
): Promise<CaptureOrderResult> {
  const payment = await getPayment(input.paymentId);
  if (!payment) {
    throw new Error(`Payment ${input.paymentId} not found`);
  }

  if (payment.amountMinor !== input.expectedAmountMinor) {
    throw new Error(
      `Capture amount mismatch: expected ${input.expectedAmountMinor}, got ${payment.amountMinor}`
    );
  }

  if (payment.currency !== input.expectedCurrency.toUpperCase()) {
    throw new Error(
      `Capture currency mismatch: expected ${input.expectedCurrency}, got ${payment.currency}`
    );
  }

  // State machine: advance to CAPTURE_PENDING then COMPLETED
  if (payment.status === "PAYER_ACTION_REQUIRED") {
    await updatePaymentStatus(payment.id, "CAPTURE_PENDING");
  }

  const simCaptureId = `SIM_CAP_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const completed = await updatePaymentStatus(payment.id, "COMPLETED", {
    providerCaptureId: simCaptureId,
  });

  return {
    paymentId: completed.id,
    providerOrderId: completed.providerOrderId || input.providerOrderId,
    providerCaptureId: simCaptureId,
    status: completed.status,
    amountMinor: completed.amountMinor,
    currency: completed.currency,
    reconciled: true,
    capturedAt: new Date(),
  };
}
