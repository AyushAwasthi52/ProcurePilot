import { describe, it, expect } from "vitest";
import { extractRequirementsFromPrompt } from "@/src/ai/orchestrator/extraction";
import { normalizeProviderOffer } from "@/src/domain/catalog/normalizer";
import { evaluateAndRankOffers } from "@/src/domain/scoring/evaluator";
import { computePriceStatistics } from "@/src/domain/pricing/statistics";
import { evaluateBuyAdvice } from "@/src/domain/pricing/rules";
import { buildPurchasePlan, verifyPlanHash, isPlanExpired } from "@/src/domain/purchase/plan";
import { validatePlanApproval, buildApprovalRecord } from "@/src/domain/purchase/approval";
import { createOrder, captureOrder } from "@/src/payments/paypal/orders";
import { reconcileWebhookEvent } from "@/src/payments/reconcile";
import { recordAuditEvent, getAuditTrail } from "@/src/observability/audit";
import { RawOfferInput } from "@/src/domain/catalog/types";

describe("ProcurePilot End-to-End Autonomous Purchasing Lifecycle (Screens 1 - 4)", () => {
  it("executes the complete, verified 10-stage autonomous purchasing lifecycle", async () => {
    // =========================================================================
    // STAGE 1: Natural Language Prompt & Structured Brief Extraction (Screen 1)
    // =========================================================================
    const userPrompt =
      "A laptop for programming and ML experiments, some gaming on the side. Max $1,800 including shipping. Good thermals, upgradeable RAM, and at least a 2-year warranty.";

    const extraction = await extractRequirementsFromPrompt(userPrompt);
    expect(extraction.brief.category).toBe("Laptop");
    expect(extraction.brief.budget.amountMinor).toBe(180000); // $1,800.00
    expect(extraction.brief.budget.currency).toBe("USD");
    expect(extraction.brief.budget.includesShipping).toBe(true);

    // Audit event: Brief validated
    await recordAuditEvent({
      userId: "usr_alice",
      entityType: "PurchaseRequest",
      entityId: "req_demo_e2e",
      action: "BRIEF_VALIDATED",
      metadata: { schemaVersion: 3, category: "Laptop" },
    });

    // =========================================================================
    // STAGE 2: Multi-Source Discovery & Normalization (Screen 1 -> Screen 2)
    // =========================================================================
    const rawOffers: RawOfferInput[] = [
      {
        providerId: "provider_a",
        providerOfferId: "ofr_vector_16",
        productTitle: "Halden Vector 16",
        brand: "Halden",
        category: "Laptop",
        merchantName: "Brightline Electronics",
        merchantId: "mer_brightline",
        productUrl: "https://brightline.example/halden-vector-16",
        price: { amountMinor: 164900, currency: "USD" },
        shipping: { status: "KNOWN", amountMinor: 0, currency: "USD" },
        availability: "in_stock",
        observedAt: new Date().toISOString(),
        attributes: {
          ramGb: 32,
          ramSlots: 2,
          ramUpgradeable: true,
          storageGb: 1024,
          gpu: "NVIDIA RTX 4070 (CUDA)",
          cudaSupport: true,
          thermalsScore: 92,
          warrantyMonths: 36,
          returnWindowDays: 30,
          sellerRating: 4.7,
          ratingCount: 1240,
          identityVerified: true,
        },
      },
      {
        providerId: "demo_catalog",
        providerOfferId: "ofr_kestrel_16",
        productTitle: "Kestrel Pro 16",
        brand: "Kestrel",
        category: "Laptop",
        merchantName: "Northgate Direct",
        merchantId: "mer_northgate",
        productUrl: "https://northgate.example/kestrel-pro-16",
        price: { amountMinor: 170000, currency: "USD" },
        shipping: { status: "KNOWN", amountMinor: 4200, currency: "USD" }, // $42 shipping -> Total $1,742.00
        availability: "in_stock",
        observedAt: new Date().toISOString(),
        attributes: {
          ramGb: 32,
          ramSlots: 2,
          ramUpgradeable: true,
          storageGb: 1024,
          gpu: "NVIDIA RTX 4060",
          cudaSupport: true,
          thermalsScore: 84,
          warrantyMonths: 24,
          returnWindowDays: 30,
          sellerRating: 4.6,
          ratingCount: 890,
          identityVerified: true,
        },
      },
      {
        providerId: "provider_a",
        providerOfferId: "ofr_orbis_15",
        productTitle: "Orbis Atlas 15",
        brand: "Orbis",
        category: "Laptop",
        merchantName: "ValueHub",
        merchantId: "mer_valuehub",
        productUrl: "https://valuehub.example/orbis-atlas-15",
        price: { amountMinor: 147900, currency: "USD" },
        shipping: { status: "UNKNOWN" },
        availability: "in_stock",
        observedAt: new Date().toISOString(),
        attributes: {
          ramGb: 16,
          ramSlots: 2,
          ramUpgradeable: true,
          storageGb: 512,
          gpu: "NVIDIA RTX 4050",
          cudaSupport: true,
          thermalsScore: 78,
          warrantyMonths: null, // UNVERIFIED constraint
          returnWindowDays: 14,
          sellerRating: 4.1,
          ratingCount: 310,
          identityVerified: true,
        },
      },
      {
        providerId: "demo_catalog",
        providerOfferId: "ofr_vector_16_max",
        productTitle: "Halden Vector 16 Max",
        brand: "Halden",
        category: "Laptop",
        merchantName: "Brightline Electronics",
        merchantId: "mer_brightline",
        productUrl: "https://brightline.example/halden-vector-16-max",
        price: { amountMinor: 214900, currency: "USD" }, // $2,149.00 -> OVER BUDGET
        shipping: { status: "KNOWN", amountMinor: 0, currency: "USD" },
        availability: "in_stock",
        observedAt: new Date().toISOString(),
        attributes: {
          ramGb: 64,
          storageGb: 2048,
          gpu: "NVIDIA RTX 4080 (CUDA)",
          cudaSupport: true,
          thermalsScore: 94,
          warrantyMonths: 36,
          identityVerified: true,
        },
      },
      {
        providerId: "provider_b",
        providerOfferId: "ofr_lumen_16",
        productTitle: "Lumen Aero 16",
        brand: "Lumen",
        category: "Laptop",
        merchantName: "Unknown Merchant",
        merchantId: "mer_unknown",
        productUrl: "https://shady.example/lumen",
        price: { amountMinor: 89900, currency: "USD" }, // 45% below comparable median (TR-02 anomaly)
        shipping: { status: "UNKNOWN" },
        availability: "in_stock",
        observedAt: new Date().toISOString(),
        attributes: {
          identityVerified: false, // TR-01 failure
          warrantyMonths: null,
          sellerRating: 2.1,
          ratingCount: 3,
        },
      },
    ];

    const normalizedOffers = rawOffers.map((r) => normalizeProviderOffer(r));
    expect(normalizedOffers).toHaveLength(5);

    // =========================================================================
    // STAGE 3: Evaluation, Scoring & Exclusion Filtering (Screen 2)
    // =========================================================================
    const evaluation = evaluateAndRankOffers(normalizedOffers, extraction.brief);

    // Eligible Candidates (Must match Screen 2 table)
    expect(evaluation.eligibleCandidates).toHaveLength(3);
    const topCandidate = evaluation.eligibleCandidates[0];
    expect(topCandidate.offer.productTitle).toBe("Halden Vector 16");
    expect(topCandidate.score.displayedScore).toBeGreaterThanOrEqual(80); // Ranked #1 Best fit
    expect(topCandidate.constraints.eligible).toBe(true);

    // Over budget candidate
    expect(evaluation.overBudgetCandidates).toHaveLength(1);
    expect(evaluation.overBudgetCandidates[0].offer.productTitle).toBe("Halden Vector 16 Max");

    // Flagged anomaly candidate
    expect(evaluation.flaggedCandidates).toHaveLength(1);
    expect(evaluation.flaggedCandidates[0].offer.productTitle).toBe("Lumen Aero 16");

    // =========================================================================
    // STAGE 4: Price Intelligence & Buy Advice Engine (Screen 2)
    // =========================================================================
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    const historicalSnapshots = [
      171900, 171000, 169900, 168900, 167900, 168500, 167900,
      166900, 165900, 164900, 163900, 162900, 163900, 164900
    ].map((amt, idx) => ({
      offerId: "ofr_vector_16",
      amountMinor: amt,
      currency: "USD",
      availability: "in_stock",
      sourceObservedAt: new Date(now - (28 - idx * 2) * day),
      ingestedAt: new Date(),
      source: "provider_a",
    }));

    const priceStats = computePriceStatistics(historicalSnapshots, 164900, "USD");
    expect(priceStats.minMinor).toBe(162900); // $1,629 LOW
    expect(priceStats.currentMinor).toBe(164900); // $1,649 NOW
    expect(priceStats.maxMinor).toBe(171900); // $1,719 HIGH
    expect(priceStats.sampleCount).toBe(14);

    const buyAdvice = evaluateBuyAdvice(priceStats, "urgent");
    expect(buyAdvice.advice).toBe("BUY_NOW");
    expect(buyAdvice.headline).toBe("Reasonable to buy now");
    expect(buyAdvice.isHistoricLow).toBe(false); // Refused historic low because only 14 snapshots over 28 days

    // =========================================================================
    // STAGE 5: Purchase Plan Generation & Canonical Hash Locking (Screen 3)
    // =========================================================================
    const plan = buildPurchasePlan({
      userId: "usr_alice",
      requestId: "req_demo_e2e",
      offerId: topCandidate.offer.id,
      itemSnapshot: {
        title: "Halden Vector 16",
        brand: "Halden",
        specs: topCandidate.offer.attributes,
        merchantId: topCandidate.offer.merchantId,
        merchantName: topCandidate.offer.merchantName,
        url: topCandidate.offer.url,
      },
      itemMinor: 164900,
      currency: "USD",
      quantity: 1,
    });

    expect(plan.status).toBe("ACTIVE");
    expect(plan.totalKnownMinor).toBe(164900);
    expect(verifyPlanHash(plan)).toBe(true);
    expect(isPlanExpired(plan)).toBe(false);

    // =========================================================================
    // STAGE 6: Human Approval Binding (Screen 3)
    // =========================================================================
    const approvalValidation = validatePlanApproval(plan, {
      planId: plan.id,
      planHash: plan.planHash,
      approvedAmountMinor: 164900,
      approvedCurrency: "USD",
    });
    expect(approvalValidation.valid).toBe(true);

    const approval = buildApprovalRecord(
      plan,
      {
        planId: plan.id,
        planHash: plan.planHash,
        approvedAmountMinor: 164900,
        approvedCurrency: "USD",
      },
      "usr_alice"
    );
    expect(approval.status).toBe("APPROVED");
    expect(approval.planHash).toBe(plan.planHash);

    // =========================================================================
    // STAGE 7: Payment Order Creation (PayPal Sandbox / Simulated)
    // =========================================================================
    const orderResult = await createOrder({
      planId: plan.id,
      approvalId: approval.id,
      amountMinor: approval.approvedAmountMinor,
      currency: approval.approvedCurrency,
      itemTitle: plan.itemSnapshot.title,
      quantity: plan.quantity,
      idempotencyKey: `idem_e2e_${plan.id}`,
      simulated: true,
    });
    expect(orderResult.status).toBe("PAYER_ACTION_REQUIRED");

    // =========================================================================
    // STAGE 8: Server-Side Capture Execution & Verification (Screen 4)
    // =========================================================================
    const captureResult = await captureOrder({
      paymentId: orderResult.paymentId,
      providerOrderId: orderResult.providerOrderId,
      expectedAmountMinor: approval.approvedAmountMinor,
      expectedCurrency: approval.approvedCurrency,
      idempotencyKey: `idem_cap_e2e_${plan.id}`,
      simulated: true,
    });
    expect(captureResult.status).toBe("COMPLETED");
    expect(captureResult.reconciled).toBe(true);

    // =========================================================================
    // STAGE 9: Webhook Reconciliation & Idempotent Deduplication (Screen 4)
    // =========================================================================
    const webhookRes = await reconcileWebhookEvent(
      "WH-EVT-E2E-99",
      "PAYMENT.CAPTURE.COMPLETED",
      JSON.stringify({ id: captureResult.providerCaptureId }),
      { id: captureResult.providerCaptureId }
    );
    expect(webhookRes.reconciled).toBe(true);
    expect(webhookRes.isDuplicate).toBe(false);

    // =========================================================================
    // STAGE 10: Immutable Audit Trail Completeness (Screen 4)
    // =========================================================================
    await recordAuditEvent({
      userId: "usr_alice",
      entityType: "Payment",
      entityId: orderResult.paymentId,
      action: "PAYMENT_RECONCILED",
      metadata: {
        amountCaptured: 164900,
        currency: "USD",
        providerCaptureId: captureResult.providerCaptureId,
      },
    });

    const auditEvents = await getAuditTrail("Payment", orderResult.paymentId);
    expect(auditEvents.length).toBeGreaterThanOrEqual(1);
  });
});
