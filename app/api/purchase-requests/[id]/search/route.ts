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
        maxBudgetMinor: purchaseRequest.brief?.budget?.amountMinor ?? undefined,
      }
    );

    // Update DB record upon completion (background or sync)
    searchPromise
      .then(async (result) => {
        try {
          await db.searchRun.update({
            where: { id: searchRunId },
            data: {
              status: result.status,
              completedAt: result.completedAt ?? new Date(),
              providerOutcomes: result.providerOutcomes as object,
            },
          });
        } catch {
          // DB offline fallback
        }
      })
      .catch(() => {});

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

export async function GET(req: NextRequest, { params }: RouteParams) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    const user = await requireSession(req);
    const { id } = await params;
    const purchaseRequest = await getPurchaseRequestById(id);

    if (!purchaseRequest) {
      throw new NotFoundError("Purchase request");
    }

    assertOwnership(user.id, purchaseRequest.userId, "Purchase request");

    // 1. Check orchestrator memory
    const runResult = searchOrchestrator.getLatestRunForRequest(id);
    if (runResult) {
      return NextResponse.json(runResult, {
        status: 200,
        headers: { "x-request-id": requestId },
      });
    }

    // 2. Check DB
    try {
      const dbRun = await db.searchRun.findFirst({
        where: { requestId: id },
        orderBy: { startedAt: "desc" },
      });
      if (dbRun) {
        return NextResponse.json(dbRun, {
          status: 200,
          headers: { "x-request-id": requestId },
        });
      }
    } catch {
      // DB offline fallback
    }

    throw new NotFoundError("Search run for this purchase request");
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}
