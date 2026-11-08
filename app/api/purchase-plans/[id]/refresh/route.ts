import { NextRequest, NextResponse } from "next/server";
import { requireSession, assertOwnership } from "@/src/auth/session";
import { verifyCsrfToken } from "@/src/auth/csrf";
import { createErrorResponse, NotFoundError, OfferChangedError } from "@/src/auth/errors";
import { db } from "@/src/db/client";
import { SEED_DATA } from "@/prisma/seed";
import { buildPurchasePlan, PLAN_TTL_SECONDS, reverifyOffer } from "@/src/domain/purchase/plan";
import { getPurchasePlan, savePurchasePlan, updatePlanStatus } from "@/src/domain/purchase/repository";
import { recordAuditEvent } from "@/src/observability/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    const user = await requireSession(req);
    verifyCsrfToken(req);

    const { id } = await params;
    const oldPlan = await getPurchasePlan(id);

    if (!oldPlan) {
      throw new NotFoundError("PurchasePlan");
    }

    assertOwnership(user.id, oldPlan.userId, "PurchasePlan");

    // Look up current offer in DB or seeded catalog to reverify price and stock
    let currentOffer = {
      priceMinor: oldPlan.itemMinor,
      availability: "in_stock",
      currency: oldPlan.currency,
    };

    try {
      const dbOffer = await db.offer.findFirst({
        where: {
          OR: [
            { id: oldPlan.offerId },
            { providerOfferId: oldPlan.offerId },
          ],
        },
      });

      if (dbOffer) {
        currentOffer = {
          priceMinor: dbOffer.priceMinor,
          availability: dbOffer.availability,
          currency: dbOffer.currency,
        };
      }
    } catch {
      // DB offline fallback
    }

    // Check seed fallback
    for (const p of SEED_DATA.products) {
      const found = p.offers.find((o) => o.providerOfferId === oldPlan.offerId);
      if (found) {
        currentOffer = {
          priceMinor: found.priceMinor,
          availability: found.availability,
          currency: found.currency,
        };
        break;
      }
    }

    const verification = reverifyOffer(oldPlan, currentOffer);
    if (!verification.stockAvailable) {
      throw new OfferChangedError("The item is no longer available in stock.");
    }

    // Spawn new plan with incremented version
    const newPlan = buildPurchasePlan({
      userId: user.id,
      requestId: oldPlan.requestId,
      offerId: oldPlan.offerId,
      version: oldPlan.version + 1,
      itemSnapshot: oldPlan.itemSnapshot,
      quantity: oldPlan.quantity,
      itemMinor: currentOffer.priceMinor,
      shippingStatus: oldPlan.shippingStatus,
      shippingMinor: oldPlan.shippingMinor,
      taxStatus: oldPlan.taxStatus,
      taxMinor: oldPlan.taxMinor,
      currency: oldPlan.currency,
      checkoutCapability: oldPlan.checkoutCapability,
      ttlSeconds: PLAN_TTL_SECONDS,
    });

    // Update old plan status to SUPERSEDED
    await updatePlanStatus(oldPlan.id, "SUPERSEDED", newPlan.id);
    await savePurchasePlan(newPlan);

    await recordAuditEvent({
      userId: user.id,
      entityType: "PurchasePlan",
      entityId: newPlan.id,
      action: "PLAN_REFRESHED",
      metadata: {
        oldPlanId: oldPlan.id,
        newPlanId: newPlan.id,
        oldVersion: oldPlan.version,
        newVersion: newPlan.version,
        priceChanged: verification.priceChanged,
      },
      requestId,
    });

    return NextResponse.json(
      {
        oldPlan: {
          ...oldPlan,
          status: "SUPERSEDED",
          supersededById: newPlan.id,
        },
        newPlan,
      },
      {
        status: 201,
        headers: { "x-request-id": requestId },
      }
    );
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}
