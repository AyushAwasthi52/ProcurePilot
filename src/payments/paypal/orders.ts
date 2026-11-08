import {
  CaptureOrderInput,
  CaptureOrderResult,
  CreateOrderInput,
  CreateOrderResult,
} from "../types";
import { getPayPalAccessToken, getPayPalConfig, isPayPalConfigured } from "./client";
import {
  createSimulatedOrder,
  captureSimulatedOrder,
} from "../simulated/adapter";
import {
  createPayment,
  getPayment,
  getPaymentByIdempotencyKey,
  updatePaymentStatus,
} from "../repository";

export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const useSimulated =
    input.simulated ||
    process.env.PAYMENTS_SIMULATED === "true" ||
    !isPayPalConfigured();

  if (useSimulated) {
    return createSimulatedOrder(input);
  }

  // Check idempotency
  const existing = await getPaymentByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    return {
      paymentId: existing.id,
      providerOrderId: existing.providerOrderId || "",
      provider: "PAYPAL",
      status: existing.status,
      amountMinor: existing.amountMinor,
      currency: existing.currency,
    };
  }

  const config = getPayPalConfig();
  const accessToken = await getPayPalAccessToken(config);
  const amountStr = (input.amountMinor / 100).toFixed(2);

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: input.planId,
        custom_id: input.planId,
        description: input.itemTitle,
        amount: {
          currency_code: input.currency.toUpperCase(),
          value: amountStr,
          breakdown: {
            item_total: {
              currency_code: input.currency.toUpperCase(),
              value: amountStr,
            },
          },
        },
      },
    ],
    application_context: {
      brand_name: "ProcurePilot Demo Store",
      user_action: "PAY_NOW",
      return_url:
        input.returnUrl || "http://localhost:3000/confirm?status=approved",
      cancel_url:
        input.cancelUrl || "http://localhost:3000/approve?status=cancelled",
    },
  };

  const res = await fetch(`${config.baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "PayPal-Request-Id": input.idempotencyKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`PayPal Order creation failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const approveLink = data.links?.find(
    (l: { rel: string; href: string }) => l.rel === "approve"
  )?.href;

  const payment = await createPayment({
    planId: input.planId,
    approvalId: input.approvalId,
    provider: "PAYPAL",
    providerOrderId: data.id,
    status: "CREATED",
    amountMinor: input.amountMinor,
    currency: input.currency,
    idempotencyKey: input.idempotencyKey,
  });

  await updatePaymentStatus(payment.id, "PAYER_ACTION_REQUIRED");

  return {
    paymentId: payment.id,
    providerOrderId: data.id,
    provider: "PAYPAL",
    status: "PAYER_ACTION_REQUIRED",
    approveUrl: approveLink,
    amountMinor: input.amountMinor,
    currency: input.currency,
  };
}

export async function captureOrder(
  input: CaptureOrderInput
): Promise<CaptureOrderResult> {
  const useSimulated =
    input.simulated ||
    process.env.PAYMENTS_SIMULATED === "true" ||
    !isPayPalConfigured();

  if (useSimulated) {
    return captureSimulatedOrder(input);
  }

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

  if (payment.status === "PAYER_ACTION_REQUIRED") {
    await updatePaymentStatus(payment.id, "CAPTURE_PENDING");
  }

  const config = getPayPalConfig();
  const accessToken = await getPayPalAccessToken(config);

  const res = await fetch(
    `${config.baseUrl}/v2/checkout/orders/${input.providerOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "PayPal-Request-Id": input.idempotencyKey,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    await updatePaymentStatus(payment.id, "FAILED", {
      failureCode: `HTTP_${res.status}`,
    });
    throw new Error(`PayPal capture failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  if (data.status !== "COMPLETED") {
    await updatePaymentStatus(payment.id, "DECLINED", {
      failureCode: data.status,
    });
    throw new Error(`PayPal order capture was not completed: ${data.status}`);
  }

  const captureId =
    data.purchase_units?.[0]?.payments?.captures?.[0]?.id || `CAP_${Date.now()}`;

  const completed = await updatePaymentStatus(payment.id, "COMPLETED", {
    providerCaptureId: captureId,
  });

  return {
    paymentId: completed.id,
    providerOrderId: completed.providerOrderId || input.providerOrderId,
    providerCaptureId: captureId,
    status: "COMPLETED",
    amountMinor: completed.amountMinor,
    currency: completed.currency,
    reconciled: true,
    capturedAt: new Date(),
  };
}

