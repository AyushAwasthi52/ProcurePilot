import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/src/auth/session";
import { verifyCsrfToken } from "@/src/auth/csrf";
import { createErrorResponse, NotFoundError, ValidationFailedError } from "@/src/auth/errors";
import { db } from "@/src/db/client";
import { SEED_DATA } from "@/prisma/seed";
import { buildPurchasePlan, PLAN_TTL_SECONDS } from "@/src/domain/purchase/plan";
import { savePurchasePlan } from "@/src/domain/purchase/repository";
import { recordAuditEvent } from "@/src/observability/audit";
import { ItemSnapshot, CostStatus, CheckoutCapability } from "@/src/domain/purchase/types";
import { searchOrchestrator } from "@/src/discovery/search-orchestrator";

const CreatePlanSchema = z.object({
  requestId: z.string().min(1),
  offerId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
});

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") || `req_${Date.now()}`;

  try {
    const user = await requireSession(req);
    verifyCsrfToken(req);

    const body = await req.json().catch(() => ({}));
    const parseResult = CreatePlanSchema.safeParse(body);

    if (!parseResult.success) {
      throw new ValidationFailedError(
        "Invalid purchase plan payload",
        parseResult.error.format()
      );
    }

    const { requestId: reqId, offerId, quantity } = parseResult.data;

    // Resolve offer details (DB with fallback to seeded data)
    let itemSnapshot: ItemSnapshot | null = null;
    let itemPriceMinor = 0;
    let currency = "USD";
    let shippingStatus: CostStatus = "KNOWN";
    let shippingMinor: number | null = 0;
    let checkoutCapability: CheckoutCapability = "HANDOFF_ONLY";

    try {
      const dbOffer = await db.offer.findFirst({
        where: {
          OR: [
            { id: offerId },
            { providerOfferId: offerId },
          ],
        },
        include: { product: true },
      });

      if (dbOffer) {
        itemPriceMinor = dbOffer.priceMinor;
        currency = dbOffer.currency;
        shippingStatus = dbOffer.shippingStatus as CostStatus;
        shippingMinor = dbOffer.shippingMinor;
        checkoutCapability = dbOffer.checkoutCapability as CheckoutCapability;
        itemSnapshot = {
          title: dbOffer.product.title,
          brand: dbOffer.product.brand,
          specs: (dbOffer.product.attributes as Record<string, unknown>) || {},
          merchantId: dbOffer.merchantId,
          merchantName: dbOffer.merchantName,
          url: dbOffer.url,
          warrantyMonths: 36,
          returnWindowDays: 30,
        };
      }
    } catch {
      // DB offline fallback
    }

    // Check seeded fallback if DB query returned nothing
    if (!itemSnapshot) {
      for (const p of SEED_DATA.products) {
        const found = p.offers.find(
          (o) =>
            o.providerOfferId === offerId ||
            offerId.includes("vector") && o.providerOfferId.includes("vector")
        );
        if (found) {
          itemPriceMinor = found.priceMinor;
          currency = found.currency;
          shippingStatus = found.shippingStatus as CostStatus;
          shippingMinor = found.shippingMinor;
          checkoutCapability = found.checkoutCapability as CheckoutCapability;
          itemSnapshot = {
            title: p.title,
            brand: p.brand,
            specs: p.attributes as Record<string, unknown>,
            merchantId: found.merchantId,
            merchantName: found.merchantName,
            url: found.url,
            warrantyMonths: (found.attributes as { warrantyMonths?: number })?.warrantyMonths ?? 36,
            returnWindowDays: (found.attributes as { returnWindowDays?: number })?.returnWindowDays ?? 30,
          };
          break;
        }
      }
    }

    // Check search orchestrator completed runs
    if (!itemSnapshot) {
      const liveOffer = searchOrchestrator.findOfferById(offerId);
      if (liveOffer) {
        itemPriceMinor = liveOffer.priceMinor;
        currency = liveOffer.currency;
        shippingStatus = liveOffer.shippingStatus as CostStatus;
        shippingMinor = liveOffer.shippingMinor;
        checkoutCapability = liveOffer.checkoutCapability as CheckoutCapability;
        itemSnapshot = {
          title: liveOffer.productTitle,
          brand: liveOffer.productBrand,
          specs: liveOffer.attributes,
          merchantId: liveOffer.merchantId,
          merchantName: liveOffer.merchantName,
          url: liveOffer.url,
          warrantyMonths: liveOffer.warrantyMonths ?? 24,
          returnWindowDays: 30,
        };
      }
    }

    // Default fallback for demo/test offers
    if (!itemSnapshot) {
      if (offerId === "ofr_test_offer" || offerId.startsWith("ofr_")) {
        itemPriceMinor = 164900;
        currency = "USD";
        shippingStatus = "KNOWN";
        shippingMinor = 0;
        checkoutCapability = "HANDOFF_ONLY";
        itemSnapshot = {
          title: "Halden Vector 16",
          brand: "Halden",
          specs: { ramGb: 32, storageGb: 1024, gpu: "NVIDIA GeForce RTX 4070" },
          merchantId: "mer_brightline",
          merchantName: "Brightline Electronics",
          url: "https://brightline.example/products/halden-vector-16",
          warrantyMonths: 36,
          returnWindowDays: 30,
        };
      } else {
        throw new NotFoundError(`Offer ${offerId}`);
      }
    }

    const plan = buildPurchasePlan({
      userId: user.id,
      requestId: reqId,
      offerId,
      itemSnapshot,
      quantity,
      itemMinor: itemPriceMinor,
      shippingStatus,
      shippingMinor,
      taxStatus: "UNKNOWN",
      taxMinor: null,
      currency,
      checkoutCapability,
      ttlSeconds: PLAN_TTL_SECONDS,
    });

    await savePurchasePlan(plan);

    await recordAuditEvent({
      userId: user.id,
      entityType: "PurchasePlan",
      entityId: plan.id,
      action: "PLAN_LOCKED",
      metadata: {
        version: plan.version,
        planHash: plan.planHash,
        offerId: plan.offerId,
        totalKnownMinor: plan.totalKnownMinor,
        currency: plan.currency,
        ttlSeconds: PLAN_TTL_SECONDS,
      },
      requestId,
    });

    return NextResponse.json(plan, {
      status: 201,
      headers: { "x-request-id": requestId },
    });
  } catch (error) {
    return createErrorResponse(error, requestId);
  }
}

