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
import { PurchaseBriefSchema } from "@/src/ai/schemas/brief";
import { recordAuditEvent } from "@/src/observability/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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

    const body = await req.json().catch(() => ({}));
    const parseResult = PurchaseBriefSchema.safeParse(body);

    if (!parseResult.success) {
      throw new ValidationFailedError(
        "Invalid purchase brief update payload",
        parseResult.error.format()
      );
    }

    const updatedBrief = parseResult.data;
    const updatedRecord = await updatePurchaseBrief(id, updatedBrief);

    await recordAuditEvent({
      userId: user.id,
      entityType: "PurchaseRequest",
      entityId: id,
      action: "BRIEF_UPDATED",
      metadata: {
        category: updatedBrief.category,
        budgetMinor: updatedBrief.budget.amountMinor,
      },
      requestId,
    });

    return NextResponse.json(
      {
        ...updatedRecord,
        brief: updatedBrief,
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
