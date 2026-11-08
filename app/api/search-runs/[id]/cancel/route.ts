import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/src/auth/session";
import { verifyCsrfToken } from "@/src/auth/csrf";
import { createErrorResponse, NotFoundError } from "@/src/auth/errors";
import { searchOrchestrator } from "@/src/discovery/search-orchestrator";
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
    const cancelled = searchOrchestrator.cancelSearch(id);

    if (!cancelled) {
      const existing = searchOrchestrator.getRunResult(id);
      if (!existing) {
        throw new NotFoundError("Search run");
      }
    }

    await recordAuditEvent({
      userId: user.id,
      entityType: "SearchRun",
      entityId: id,
      action: "SEARCH_CANCELLED",
      requestId,
    });

    return NextResponse.json(
      {
        searchRunId: id,
        status: "CANCELLED",
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
