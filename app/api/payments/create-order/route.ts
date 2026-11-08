import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, assertOwnership } from "@/src/auth/session";
import { verifyCsrfToken } from "@/src/auth/csrf";
import {
  createErrorResponse,
  NotFoundError,
  ValidationFailedError,
  ApiError,
} from "@/src/auth/errors";
import { getPurchasePlan, getApprovalForPlan } from "@/src/domain/purchase/repository";
import { createOrder } from "@/src/payments/paypal/orders";
import { recordAuditEvent } from "@/src/observability/audit";

const CreatePaymentOrderSchema = z.object({
  planId: z.string().min(1),
  approvalId: z.string().min(1),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  simulated: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    const user = await requireSession(req);
    verifyCsrfToken(req);

    const body = await req.json().catch(() => ({}));
    const parseResult = CreatePaymentOrderSchema.safeParse(body);

    if (!parseResult.success) {
      throw new ValidationFailedError(
        "Invalid payment order payload",
        parseResult.error.format()
      );
    }

    const { planId, approvalId, returnUrl, cancelUrl, simulated } = parseResult.data;

    // Verify Plan
    const plan = await getPurchasePlan(planId);
    if (!plan) {
      throw new NotFoundError("PurchasePlan");
    }
    assertOwnership(user.id, plan.userId, "PurchasePlan");

    if (plan.status !== "APPROVED") {
      throw new ApiError(
        "APPROVAL_REQUIRED",
        "Cannot create payment order for an unapproved purchase plan",
        400
      );
    }

    // Verify Approval
    const approval = await getApprovalForPlan(planId);
    if (!approval || approval.id !== approvalId) {
      throw new ApiError(
        "APPROVAL_REQUIRED",
        "Valid approval record is required to initiate checkout",
        400
      );
    }

    if (approval.planHash !== plan.planHash) {
      throw new ApiError(
        "PLAN_HASH_MISMATCH",
        "Approval hash does not match current plan hash",
        409
      );
    }

    const idempotencyKey =
      req.headers.get("idempotency-key") ||
      `idem_order_${plan.id}_${approval.id}_${plan.version}`;

    const orderResult = await createOrder({
      planId: plan.id,
      approvalId: approval.id,
      amountMinor: approval.approvedAmountMinor,
      currency: approval.approvedCurrency,
      itemTitle: plan.itemSnapshot.title,
      quantity: plan.quantity,
      returnUrl,
      cancelUrl,
      idempotencyKey,
      simulated,
    });

    await recordAuditEvent({
      userId: user.id,
      entityType: "Payment",
      entityId: orderResult.paymentId,
      action: "ORDER_CREATED",
      metadata: {
        planId: plan.id,
        approvalId: approval.id,
        providerOrderId: orderResult.providerOrderId,
        provider: orderResult.provider,
        amountMinor: orderResult.amountMinor,
        currency: orderResult.currency,
        idempotencyKey,
      },
      requestId,
    });

    return NextResponse.json(orderResult, {
      status: 201,
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}

