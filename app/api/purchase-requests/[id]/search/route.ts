import { NextRequest, NextResponse } from "next/server";
import { requireSession, assertOwnership } from "@/src/auth/session";
import { verifyCsrfToken } from "@/src/auth/csrf";
import { createErrorResponse, NotFoundError } from "@/src/auth/errors";
import { getPurchaseRequestById } from "@/src/db/queries/purchase-requests";
import { searchOrchestrator } from "@/src/discovery/search-orchestrator";
import { recordAuditEvent } from "@/src/observability/audit";
import { db } from "@/src/db/client";

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

    const searchRunId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Try persisting SearchRun record to DB
    try {
      await db.searchRun.create({
        data: {
          id: searchRunId,
          requestId: id,
          status: "IN_PROGRESS",
          providerOutcomes: {},
        },
      });
    } catch {
      // In-memory fallback managed inside searchOrchestrator
    }

    // Launch discovery
    const searchPromise = searchOrchestrator.executeSearch(
      searchRunId,
      id,
      {
        query: purchaseRequest.brief?.query ?? purchaseRequest.rawPrompt,
        category: purchaseRequest.brief?.category,
        region: purchaseRequest.region,
        currency: purchaseRequest.currency,
        maxBudgetMinor: purchaseRequest.brief?.budget?.amountMinor,
      }
    );

    // If client requested immediate execution (e.g. non-streaming or tests)
    const syncWait = req.headers.get("x-sync-search") === "true";
    if (syncWait) {
      const result = await searchPromise;
      return NextResponse.json(result, {
        status: 201,
        headers: { "x-request-id": requestId },
      });
    }

    await recordAuditEvent({
      userId: user.id,
      entityType: "SearchRun",
      entityId: searchRunId,
      action: "SEARCH_STARTED",
      metadata: { requestId: id },
      requestId,
    });

    return NextResponse.json(
      {
        searchRunId,
        status: "IN_PROGRESS",
      },
      {
        status: 201,
        headers: {
          "x-request-id": requestId,
        },
      }
    );
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}
