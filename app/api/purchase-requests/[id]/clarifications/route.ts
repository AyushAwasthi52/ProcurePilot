import { NextRequest, NextResponse } from "next/server";
import { requireSession, assertOwnership } from "@/src/auth/session";
import { verifyCsrfToken } from "@/src/auth/csrf";
import {
  createErrorResponse,
  NotFoundError,
  ValidationFailedError,
} from "@/src/auth/errors";
import {
  getPurchaseRequestById,
  updatePurchaseBrief,
} from "@/src/db/queries/purchase-requests";
import { ClarificationAnswerSchema } from "@/src/ai/schemas/clarification";
import {
  applyClarificationAnswer,
  evaluateClarificationPolicy,
} from "@/src/ai/orchestrator/clarification";
import { recordAuditEvent } from "@/src/observability/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    const user = await requireSession(req);
    verifyCsrfToken(req);

    const { id } = await params;
    const purchaseRequest = await getPurchaseRequestById(id);

    if (!purchaseRequest) {
      throw new NotFoundError("Purchase request");
    }

    assertOwnership(user.id, purchaseRequest.userId, "Purchase request");

    if (!purchaseRequest.brief) {
      throw new ValidationFailedError("Purchase request has no brief to clarify");
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = ClarificationAnswerSchema.safeParse(body);

    if (!parseResult.success) {
      throw new ValidationFailedError(
        "Invalid clarification answer payload",
        parseResult.error.format()
      );
    }

    const answer = parseResult.data;
    const updatedBrief = applyClarificationAnswer(purchaseRequest.brief, answer);
    const remainingQuestion = evaluateClarificationPolicy(updatedBrief);

    const updatedRecord = await updatePurchaseBrief(id, updatedBrief);

    await recordAuditEvent({
      userId: user.id,
      entityType: "PurchaseRequest",
      entityId: id,
      action: "CLARIFICATION_ANSWERED",
      metadata: {
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        remainingQuestions: remainingQuestion ? 1 : 0,
      },
      requestId,
    });

    return NextResponse.json(
      {
        ...updatedRecord,
        brief: updatedBrief,
        clarificationQuestion: remainingQuestion,
      },
      {
        status: 200,
        headers: {
          "x-request-id": requestId,
        },
      }
    );
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}
