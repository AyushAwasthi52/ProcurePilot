import { describe, it, expect, beforeEach } from "vitest";
import { createOrder, captureOrder } from "@/src/payments/paypal/orders";
import { clearInMemoryPayments } from "@/src/payments/repository";
import { reconcileWebhookEvent, clearWebhookDeduplicationCache } from "@/src/payments/reconcile";

describe("Payment Orders & Sandbox Lifecycle", () => {
  beforeEach(() => {
    clearInMemoryPayments();
    clearWebhookDeduplicationCache();
  });

  it("creates a simulated order with matching amount and currency", async () => {
    const res = await createOrder({
      planId: "plan_test_123",
      approvalId: "appr_test_123",
      amountMinor: 164900,
      currency: "USD",
      itemTitle: "Halden Vector 16",
      quantity: 1,
      idempotencyKey: "idem_order_1",
      simulated: true,
    });

    expect(res.paymentId).toBeDefined();
    expect(res.providerOrderId).toMatch(/^SIM_ORDER_/);
    expect(res.status).toBe("PAYER_ACTION_REQUIRED");
    expect(res.amountMinor).toBe(164900);
    expect(res.currency).toBe("USD");
  });

  it("captures an order server-side and marks status COMPLETED", async () => {
    // 1. Create order
    const created = await createOrder({
      planId: "plan_test_456",
      approvalId: "appr_test_456",
      amountMinor: 164900,
      currency: "USD",
      itemTitle: "Halden Vector 16",
      quantity: 1,
      idempotencyKey: "idem_order_2",
      simulated: true,
    });

    // 2. Capture order
    const captured = await captureOrder({
      paymentId: created.paymentId,
      providerOrderId: created.providerOrderId,
      expectedAmountMinor: 164900,
      expectedCurrency: "USD",
      idempotencyKey: "idem_cap_2",
      simulated: true,
    });

    expect(captured.status).toBe("COMPLETED");
    expect(captured.providerCaptureId).toMatch(/^SIM_CAP_/);
    expect(captured.reconciled).toBe(true);
  });

  it("rejects capture if the amount or currency diverges from approved value", async () => {
    const created = await createOrder({
      planId: "plan_test_789",
      approvalId: "appr_test_789",
      amountMinor: 164900,
      currency: "USD",
      itemTitle: "Halden Vector 16",
      quantity: 1,
      idempotencyKey: "idem_order_3",
      simulated: true,
    });

    // Divergent amount
    await expect(
      captureOrder({
        paymentId: created.paymentId,
        providerOrderId: created.providerOrderId,
        expectedAmountMinor: 154900, // Tampered amount
        expectedCurrency: "USD",
        idempotencyKey: "idem_cap_3",
        simulated: true,
      })
    ).rejects.toThrow("Capture amount mismatch");
  });

  it("handles webhook reconciliation and deduplicates repeated deliveries", async () => {
    const rawPayload = JSON.stringify({
      id: "WH-EVT-1001",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {
        id: "CAP-9988",
        supplementary_data: {
          related_ids: {
            order_id: "SIM_ORDER_EXISTING",
          },
        },
      },
    });

    const res1 = await reconcileWebhookEvent(
      "WH-EVT-1001",
      "PAYMENT.CAPTURE.COMPLETED",
      rawPayload,
      { id: "CAP-9988" }
    );
    expect(res1.reconciled).toBe(true);
    expect(res1.isDuplicate).toBe(false);

    // Second delivery of identical event ID
    const res2 = await reconcileWebhookEvent(
      "WH-EVT-1001",
      "PAYMENT.CAPTURE.COMPLETED",
      rawPayload,
      { id: "CAP-9988" }
    );
    expect(res2.reconciled).toBe(true);
    expect(res2.isDuplicate).toBe(true);
    expect(res2.message).toContain("Duplicate");
  });
});
