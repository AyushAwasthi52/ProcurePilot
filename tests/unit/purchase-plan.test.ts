import { describe, it, expect, beforeEach } from "vitest";
import {
  buildPurchasePlan,
  canonicalJsonStringify,
  isPlanExpired,
  verifyPlanHash,
  PLAN_TTL_SECONDS,
  reverifyOffer,
} from "@/src/domain/purchase/plan";
import {
  validatePlanApproval,
  buildApprovalRecord,
} from "@/src/domain/purchase/approval";
import { clearInMemoryPlans } from "@/src/domain/purchase/repository";
import { ItemSnapshot, PurchasePlan } from "@/src/domain/purchase/types";
import { POST as createPlanHandler } from "@/app/api/purchase-plans/route";
import { GET as getPlanHandler } from "@/app/api/purchase-plans/[id]/route";
import { POST as approvePlanHandler } from "@/app/api/purchase-plans/[id]/approve/route";
import { NextRequest } from "next/server";
import { createSessionToken } from "@/src/auth/session";

describe("Purchase Plan & Approval Engine (Section 7, ADR-004)", () => {
  beforeEach(() => {
    clearInMemoryPlans();
  });

  const sampleItemSnapshot: ItemSnapshot = {
    title: "Halden Vector 16",
    brand: "Halden",
    specs: { ramGb: 32, storageGb: 1024, gpu: "NVIDIA GeForce RTX 4070" },
    merchantId: "mer_brightline",
    merchantName: "Brightline Electronics",
    merchantType: "direct",
    url: "https://brightline.example/halden-vector-16",
    warrantyMonths: 36,
    returnWindowDays: 30,
  };

  it("builds a purchase plan with 10-minute (600s) TTL and server-computed total", () => {
    const startTime = new Date("2026-11-08T12:00:00Z");
    const plan = buildPurchasePlan({
      userId: "usr_alice",
      requestId: "req_123",
      offerId: "ofr_vec16",
      itemSnapshot: sampleItemSnapshot,
      quantity: 1,
      itemMinor: 164900,
      shippingStatus: "KNOWN",
      shippingMinor: 0,
      currency: "USD",
      createdAt: startTime,
    });

    expect(plan.totalKnownMinor).toBe(164900);
    expect(plan.status).toBe("ACTIVE");
    expect(plan.version).toBe(1);
    expect(plan.expiresAt.getTime() - startTime.getTime()).toBe(PLAN_TTL_SECONDS * 1000);
    expect(plan.planHash).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyPlanHash(plan)).toBe(true);
  });

  it("calculates canonical SHA-256 hash that is independent of key insertion order", () => {
    const objA = { z: 1, a: "test", m: { nestedB: 2, nestedA: 1 } };
    const objB = { a: "test", m: { nestedA: 1, nestedB: 2 }, z: 1 };

    expect(canonicalJsonStringify(objA)).toBe(canonicalJsonStringify(objB));
    expect(canonicalJsonStringify(objA)).toBe(
      '{"a":"test","m":{"nestedA":1,"nestedB":2},"z":1}'
    );
  });

  it("detects tampering when any monetary or plan attribute is modified", () => {
    const plan = buildPurchasePlan({
      userId: "usr_alice",
      requestId: "req_123",
      offerId: "ofr_vec16",
      itemSnapshot: sampleItemSnapshot,
      quantity: 1,
      itemMinor: 164900,
      currency: "USD",
    });

    expect(verifyPlanHash(plan)).toBe(true);

    // Tampered price
    const tamperedPlan: PurchasePlan = {
      ...plan,
      itemMinor: 144900,
      totalKnownMinor: 144900,
    };
    expect(verifyPlanHash(tamperedPlan)).toBe(false);
  });

  it("enforces expiration after 600 seconds", () => {
    const createdTime = new Date("2026-11-08T12:00:00Z");
    const plan = buildPurchasePlan({
      userId: "usr_alice",
      requestId: "req_123",
      offerId: "ofr_vec16",
      itemSnapshot: sampleItemSnapshot,
      itemMinor: 164900,
      currency: "USD",
      createdAt: createdTime,
    });

    // 5 minutes in -> not expired
    const timeAt5Min = new Date("2026-11-08T12:05:00Z");
    expect(isPlanExpired(plan, timeAt5Min)).toBe(false);

    // 10 minutes and 1 second in -> expired
    const timeAt10Min1Sec = new Date("2026-11-08T12:10:01Z");
    expect(isPlanExpired(plan, timeAt10Min1Sec)).toBe(true);
  });

  it("validates approval successfully on matching terms", () => {
    const plan = buildPurchasePlan({
      userId: "usr_alice",
      requestId: "req_123",
      offerId: "ofr_vec16",
      itemSnapshot: sampleItemSnapshot,
      itemMinor: 164900,
      currency: "USD",
    });

    const validation = validatePlanApproval(plan, {
      planId: plan.id,
      planHash: plan.planHash,
      approvedAmountMinor: 164900,
      approvedCurrency: "USD",
    });

    expect(validation.valid).toBe(true);

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
    expect(approval.approvedAmountMinor).toBe(164900);
  });

  it("rejects approval on hash mismatch, expired plan, or monetary divergence", () => {
    const createdTime = new Date("2026-11-08T12:00:00Z");
    const plan = buildPurchasePlan({
      userId: "usr_alice",
      requestId: "req_123",
      offerId: "ofr_vec16",
      itemSnapshot: sampleItemSnapshot,
      itemMinor: 164900,
      currency: "USD",
      createdAt: createdTime,
    });

    // Hash mismatch
    const hashRes = validatePlanApproval(plan, {
      planId: plan.id,
      planHash: "wronghash".padEnd(64, "0"),
      approvedAmountMinor: 164900,
      approvedCurrency: "USD",
    });
    expect(hashRes.valid).toBe(false);
    expect(hashRes.errorCode).toBe("PLAN_HASH_MISMATCH");

    // Amount mismatch
    const amtRes = validatePlanApproval(plan, {
      planId: plan.id,
      planHash: plan.planHash,
      approvedAmountMinor: 154900,
      approvedCurrency: "USD",
    });
    expect(amtRes.valid).toBe(false);
    expect(amtRes.errorCode).toBe("AMOUNT_MISMATCH");

    // Currency mismatch
    const currRes = validatePlanApproval(plan, {
      planId: plan.id,
      planHash: plan.planHash,
      approvedAmountMinor: 164900,
      approvedCurrency: "EUR",
    });
    expect(currRes.valid).toBe(false);
    expect(currRes.errorCode).toBe("CURRENCY_MISMATCH");

    // Expired plan
    const expiredRes = validatePlanApproval(
      plan,
      {
        planId: plan.id,
        planHash: plan.planHash,
        approvedAmountMinor: 164900,
        approvedCurrency: "USD",
      },
      new Date("2026-11-08T12:15:00Z")
    );
    expect(expiredRes.valid).toBe(false);
    expect(expiredRes.errorCode).toBe("PLAN_EXPIRED");
  });

  it("re-verifies offer price and stock changes correctly", () => {
    const plan = buildPurchasePlan({
      userId: "usr_alice",
      requestId: "req_123",
      offerId: "ofr_vec16",
      itemSnapshot: sampleItemSnapshot,
      itemMinor: 164900,
      currency: "USD",
    });

    // Unchanged
    const res1 = reverifyOffer(plan, {
      priceMinor: 164900,
      availability: "in_stock",
      currency: "USD",
    });
    expect(res1.valid).toBe(true);

    // Out of stock
    const res2 = reverifyOffer(plan, {
      priceMinor: 164900,
      availability: "out_of_stock",
      currency: "USD",
    });
    expect(res2.valid).toBe(false);
    expect(res2.stockAvailable).toBe(false);

    // Price changed
    const res3 = reverifyOffer(plan, {
      priceMinor: 174900,
      availability: "in_stock",
      currency: "USD",
    });
    expect(res3.valid).toBe(false);
    expect(res3.priceChanged).toBe(true);
  });

  describe("Purchase Plan API Endpoints", () => {
    it("creates a purchase plan and allows the owner to fetch and approve it", async () => {
      const token = await createSessionToken({
        id: "usr_alice",
        email: "alice@example.com",
      });

      // 1. Create plan
      const createReq = new NextRequest("http://localhost/api/purchase-plans", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `procurepilot_session=${token}`,
          "x-test-skip-csrf": "true",
        },
        body: JSON.stringify({
          requestId: "req_123",
          offerId: "ofr_vector16_brightline",
          quantity: 1,
        }),
      });

      const createRes = await createPlanHandler(createReq);
      expect(createRes.status).toBe(201);
      const plan = await createRes.json();
      expect(plan.id).toBeDefined();
      expect(plan.planHash).toBeDefined();
      expect(plan.totalKnownMinor).toBe(164900);

      // 2. Fetch plan
      const getReq = new NextRequest(`http://localhost/api/purchase-plans/${plan.id}`, {
        headers: { cookie: `procurepilot_session=${token}` },
      });
      const getRes = await getPlanHandler(getReq, {
        params: Promise.resolve({ id: plan.id }),
      });
      expect(getRes.status).toBe(200);
      const fetchedPlan = await getRes.json();
      expect(fetchedPlan.id).toBe(plan.id);

      // 3. IDOR protection: Bob cannot access Alice's plan
      const bobToken = await createSessionToken({
        id: "usr_bob",
        email: "bob@example.com",
      });
      const bobReq = new NextRequest(`http://localhost/api/purchase-plans/${plan.id}`, {
        headers: { cookie: `procurepilot_session=${bobToken}` },
      });
      const bobRes = await getPlanHandler(bobReq, {
        params: Promise.resolve({ id: plan.id }),
      });
      expect(bobRes.status).toBe(404);

      // 4. Approve plan
      const approveReq = new NextRequest(
        `http://localhost/api/purchase-plans/${plan.id}/approve`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: `procurepilot_session=${token}`,
            "x-test-skip-csrf": "true",
          },
          body: JSON.stringify({
            planHash: plan.planHash,
            approvedAmountMinor: 164900,
            approvedCurrency: "USD",
          }),
        }
      );
      const approveRes = await approvePlanHandler(approveReq, {
        params: Promise.resolve({ id: plan.id }),
      });
      expect(approveRes.status).toBe(200);
      const approvalData = await approveRes.json();
      expect(approvalData.approval.status).toBe("APPROVED");
      expect(approvalData.plan.status).toBe("APPROVED");
    });
  });
});
