import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/src/auth/session";
import { verifyCsrfToken } from "@/src/auth/csrf";
import { createErrorResponse, ValidationFailedError } from "@/src/auth/errors";
import { createPurchaseRequest } from "@/src/db/queries/purchase-requests";
import { extractRequirementsFromPrompt } from "@/src/ai/orchestrator/extraction";
import { recordAuditEvent } from "@/src/observability/audit";

const CreateRequestSchema = z.object({
  rawPrompt: z.string().min(5, "Prompt must be at least 5 characters").max(2000),
  region: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
  quantity: z.number().int().positive().optional(),
  urgency: z.enum(["low", "normal", "urgent"]).optional(),
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

    const { rawPrompt, region, currency, quantity, urgency } = parseResult.data;

    // AI Requirement Extraction (structured output + Zod validation)
    const { brief, clarificationQuestion } = await extractRequirementsFromPrompt(
      rawPrompt,
      { region, currency, quantity, urgency }
    );

    const purchaseRequest = await createPurchaseRequest({
      userId: user.id,
      rawPrompt,
      region: region ?? brief.region,
      currency: currency ?? brief.budget?.currency ?? "USD",
      brief,
    });

    await recordAuditEvent({
      userId: user.id,
      entityType: "PurchaseRequest",
      entityId: purchaseRequest.id,
      action: "CREATED_WITH_BRIEF",
      metadata: {
        category: brief.category,
        budgetMinor: brief.budget?.amountMinor ?? null,
        currency: brief.budget?.currency ?? currency ?? "USD",
        mustHaveCount: brief.mustHave.length,
        hasClarification: !!clarificationQuestion,
      },
      requestId,
    });

    return NextResponse.json(
      {
        ...purchaseRequest,
        brief,
        clarificationQuestion,
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
