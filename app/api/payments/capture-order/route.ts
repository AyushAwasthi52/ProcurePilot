import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, assertOwnership } from "@/src/auth/session";
import { verifyCsrfToken } from "@/src/auth/csrf";
import {
  createErrorResponse,
  NotFoundError,
  ValidationFailedError,
} from "@/src/auth/errors";
import { getPayment } from "@/src/payments/repository";
import { getPurchasePlan } from "@/src/domain/purchase/repository";
import { captureOrder } from "@/src/payments/paypal/orders";
import { recordAuditEvent } from "@/src/observability/audit";

const CapturePaymentSchema = z.object({
  paymentId: z.string().min(1),
  providerOrderId: z.string().min(1),
  simulated: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    const user = await requireSession(req);
    verifyCsrfToken(req);

    const body = await req.json().catch(() => ({}));
    const parseResult = CapturePaymentSchema.safeParse(body);

    if (!parseResult.success) {
      throw new ValidationFailedError(
        "Invalid capture payload",
        parseResult.error.format()
      );
    }

    const { paymentId, providerOrderId, simulated } = parseResult.data;

    const payment = await getPayment(paymentId);
    if (!payment) {
      throw new NotFoundError("Payment");
    }

    // Check ownership via the plan
    const plan = await getPurchasePlan(payment.planId);
    if (plan) {
      assertOwnership(user.id, plan.userId, "Payment");
    }

    const idempotencyKey =
      req.headers.get("idempotency-key") ||
      `idem_cap_${payment.id}_${payment.version}`;

    const captureResult = await captureOrder({
      paymentId: payment.id,
      providerOrderId,
      expectedAmountMinor: payment.amountMinor,
      expectedCurrency: payment.currency,
      idempotencyKey,
      simulated,
    });

    await recordAuditEvent({
      userId: user.id,
      entityType: "Payment",
      entityId: payment.id,
      action: "PAYMENT_CAPTURED",
      metadata: {
        paymentId: payment.id,
        providerOrderId: captureResult.providerOrderId,
        providerCaptureId: captureResult.providerCaptureId,
        amountMinor: captureResult.amountMinor,
        currency: captureResult.currency,
        status: captureResult.status,
      },
      requestId,
    });

    return NextResponse.json(captureResult, {
      status: 200,
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}

