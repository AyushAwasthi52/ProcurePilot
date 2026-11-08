import { NextRequest, NextResponse } from "next/server";
import { requireSession, assertOwnership } from "@/src/auth/session";
import { createErrorResponse, NotFoundError } from "@/src/auth/errors";
import { getPurchasePlan, updatePlanStatus } from "@/src/domain/purchase/repository";
import { isPlanExpired } from "@/src/domain/purchase/plan";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    const user = await requireSession(req);
    const { id } = await params;

    const plan = await getPurchasePlan(id);
    if (!plan) {
      throw new NotFoundError("PurchasePlan");
    }

    assertOwnership(user.id, plan.userId, "PurchasePlan");

    // Check expiration
    if (isPlanExpired(plan) && plan.status === "ACTIVE") {
      plan.status = "EXPIRED";
      await updatePlanStatus(plan.id, "EXPIRED");
    }

    return NextResponse.json(plan, {
      status: 200,
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}

