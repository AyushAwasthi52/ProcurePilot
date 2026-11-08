import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/src/auth/session";
import { verifyCsrfToken } from "@/src/auth/csrf";
import { createErrorResponse, ValidationFailedError } from "@/src/auth/errors";
import { createPurchaseRequest } from "@/src/db/queries/purchase-requests";
import { recordAuditEvent } from "@/src/observability/audit";

const CreateRequestSchema = z.object({
  rawPrompt: z.string().min(5, "Prompt must be at least 5 characters").max(2000),
  region: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
});

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    const user = await requireSession(req);
    verifyCsrfToken(req);

    const body = await req.json().catch(() => ({}));
    const parseResult = CreateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      throw new ValidationFailedError(
        "Invalid purchase request payload",
        parseResult.error.format()
      );
    }

    const { rawPrompt, region, currency } = parseResult.data;

    const purchaseRequest = await createPurchaseRequest({
      userId: user.id,
      rawPrompt,
      region,
      currency,
    });

    await recordAuditEvent({
      userId: user.id,
      entityType: "PurchaseRequest",
      entityId: purchaseRequest.id,
      action: "CREATED",
      metadata: {
        rawPromptLength: rawPrompt.length,
        region: purchaseRequest.region,
        currency: purchaseRequest.currency,
      },
      requestId,
    });

    return NextResponse.json(purchaseRequest, {
      status: 201,
      headers: {
        "x-request-id": requestId,
      },
    });
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}

