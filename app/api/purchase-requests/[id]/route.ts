import { NextRequest, NextResponse } from "next/server";
import { requireSession, assertOwnership } from "@/src/auth/session";
import { createErrorResponse, NotFoundError } from "@/src/auth/errors";
import { getPurchaseRequestById } from "@/src/db/queries/purchase-requests";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    const user = await requireSession(req);
    const { id } = await params;

    const purchaseRequest = await getPurchaseRequestById(id);
    if (!purchaseRequest) {
      throw new NotFoundError("Purchase request");
    }

    // Strict ownership enforcement: returns 404 for resources owned by others to prevent IDOR & existence leaks
    assertOwnership(user.id, purchaseRequest.userId, "Purchase request");

    return NextResponse.json(purchaseRequest, {
      status: 200,
      headers: {
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}

