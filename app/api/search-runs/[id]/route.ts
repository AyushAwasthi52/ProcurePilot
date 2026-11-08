import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/src/auth/session";
import { createErrorResponse, NotFoundError } from "@/src/auth/errors";
import { searchOrchestrator } from "@/src/discovery/search-orchestrator";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    await requireSession(req);
    const { id } = await params;

    const result = searchOrchestrator.getRunResult(id);
    if (!result) {
      throw new NotFoundError("Search run");
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}
