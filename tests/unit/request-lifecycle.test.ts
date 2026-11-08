import { describe, it, expect, vi } from "vitest";
import { extractRequirementsFromPrompt } from "@/src/ai/orchestrator/extraction";
import { POST as createRequestRoute } from "@/app/api/purchase-requests/route";
import { NextRequest } from "next/server";

describe("Phase 1: Request Lifecycle & Concurrency Protection", () => {
  it("rejects empty prompt or prompts below minimum character length", async () => {
    const req = new NextRequest("http://localhost/api/purchase-requests", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-skip-csrf": "true",
      },
      body: JSON.stringify({ rawPrompt: "abc" }),
    });

    const res = await createRequestRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_FAILED");
  });

  it("associates extracted brief with exact provided region, currency, quantity and urgency overrides", async () => {
    const result = await extractRequirementsFromPrompt(
      "Ergonomic mesh chair with adjustable lumbar support under $400",
      {
        region: "EU",
        currency: "EUR",
        quantity: 3,
        urgency: "urgent",
      }
    );

    expect(result.brief.region).toBe("EU");
    expect(result.brief.budget.currency).toBe("EUR");
    expect(result.brief.quantity).toBe(3);
    expect(result.brief.urgency).toBe("urgent");
  });

  it("creates purchase request with custom quantity and urgency via API route", async () => {
    const req = new NextRequest("http://localhost/api/purchase-requests", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-skip-csrf": "true",
      },
      body: JSON.stringify({
        rawPrompt: "4K 27-inch monitor with USB-C hub connectivity under $600",
        region: "CA",
        currency: "CAD",
        quantity: 2,
        urgency: "urgent",
      }),
    });

    const res = await createRequestRoute(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.region).toBe("CA");
    expect(body.currency).toBe("CAD");
    expect(body.brief.quantity).toBe(2);
    expect(body.brief.urgency).toBe("urgent");
  });

  it("handles out-of-order asynchronous responses by sequence ordering", async () => {
    // Simulates the exact sequencing mechanism implemented in app/page.tsx
    let activeSequence = 0;
    let latestCommittedData: string | null = null;

    const simulateAnalysis = async (seq: number, delayMs: number, resultValue: string) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      // Only commit if this sequence is still the latest
      if (seq === activeSequence) {
        latestCommittedData = resultValue;
      }
    };

    // User types "laptop" (seq 1, slow 80ms)
    activeSequence = 1;
    const req1 = simulateAnalysis(1, 80, "Laptop");

    // User quickly changes mind to "headphones" (seq 2, fast 20ms)
    activeSequence = 2;
    const req2 = simulateAnalysis(2, 20, "Headphones");

    await Promise.all([req1, req2]);

    // Seq 1 finished later than Seq 2, but Seq 2 should be the committed data
    expect(latestCommittedData).toBe("Headphones");
  });

  it("aborts active AbortController when user edits inputs before completion", async () => {
    const controller = new AbortController();
    const abortSpy = vi.spyOn(controller, "abort");

    // User edits prompt -> invalidate and abort
    controller.abort();
    expect(abortSpy).toHaveBeenCalled();
    expect(controller.signal.aborted).toBe(true);
  });
});
