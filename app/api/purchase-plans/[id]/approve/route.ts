import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, assertOwnership } from "@/src/auth/session";
import { verifyCsrfToken } from "@/src/auth/csrf";
import {
  createErrorResponse,
  NotFoundError,
  ValidationFailedError,
  PlanExpiredError,
  PlanHashMismatchError,
  ApiError,
} from "@/src/auth/errors";
import {
  getPurchasePlan,
  saveApproval,
  updatePlanStatus,
} from "@/src/domain/purchase/repository";
import {
  buildApprovalRecord,
  validatePlanApproval,
} from "@/src/domain/purchase/approval";
import { recordAuditEvent } from "@/src/observability/audit";

const ApproveSchema = z.object({
  planHash: z.string().length(64),
  approvedAmountMinor: z.number().int().positive(),
  approvedCurrency: z.string().length(3),
  acknowledgedUnverified: z.array(z.string()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    const user = await requireSession(req);
    verifyCsrfToken(req);

    const { id } = await params;
    const plan = await getPurchasePlan(id);

    if (!plan) {
      throw new NotFoundError("PurchasePlan");
    }

    assertOwnership(user.id, plan.userId, "PurchasePlan");

    const body = await req.json().catch(() => ({}));
    const parseResult = ApproveSchema.safeParse(body);

    if (!parseResult.success) {
      throw new ValidationFailedError(
        "Invalid approval submission payload",
        parseResult.error.format()
      );
    }

    const submission = {
      planId: plan.id,
      planHash: parseResult.data.planHash,
      approvedAmountMinor: parseResult.data.approvedAmountMinor,
      approvedCurrency: parseResult.data.approvedCurrency,
      acknowledgedUnverified: parseResult.data.acknowledgedUnverified,
    };

    const validation = validatePlanApproval(plan, submission);

    if (!validation.valid) {
      switch (validation.errorCode) {
        case "PLAN_EXPIRED":
          await updatePlanStatus(plan.id, "EXPIRED");
          throw new PlanExpiredError(validation.errorMessage);
        case "PLAN_HASH_MISMATCH":
          throw new PlanHashMismatchError(validation.errorMessage);
        case "AMOUNT_MISMATCH":
        case "CURRENCY_MISMATCH":
          throw new ApiError(
            "VALIDATION_FAILED",
            validation.errorMessage || "Approval terms mismatch",
            422
          );
        default:
          throw new ApiError(
            "VALIDATION_FAILED",
            validation.errorMessage || "Validation failed",
            400
          );
      }
    }

    const approval = buildApprovalRecord(plan, submission, user.id);
    await saveApproval(approval);
    await updatePlanStatus(plan.id, "APPROVED");

    await recordAuditEvent({
      userId: user.id,
      entityType: "Approval",
      entityId: approval.id,
      action: "PLAN_APPROVED",
      metadata: {
        planId: plan.id,
        planHash: approval.planHash,
        approvedAmountMinor: approval.approvedAmountMinor,
        approvedCurrency: approval.approvedCurrency,
      },
      requestId,
    });

    return NextResponse.json(
      {
        approval,
        plan: {
          ...plan,
          status: "APPROVED",
        },
      },
      {
        status: 200,
        headers: { "x-request-id": requestId },
      }
    );
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}

