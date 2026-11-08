import { describe, it, expect, beforeEach } from "vitest";
import { createOrder, captureOrder } from "@/src/payments/paypal/orders";
import { verifyPayPalWebhookSignature } from "@/src/payments/paypal/webhook";
import { clearInMemoryPayments } from "@/src/payments/repository";
import { NextRequest } from "next/server";
import { POST as webhookHandler } from "@/app/api/webhooks/paypal/route";

describe("PayPal Safety & Webhook Verification (Section 4)", () => {
  beforeEach(() => {
    clearInMemoryPayments();
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
  });

  it("does NOT silently simulate payments when credentials are missing and simulation is disabled", async () => {
    process.env.PAYMENTS_SIMULATED = "false";

    await expect(
      createOrder({
        planId: "plan_live_123",
        approvalId: "appr_live_123",
        amountMinor: 164900,
        currency: "USD",
        itemTitle: "Halden Vector 16",
        quantity: 1,
        idempotencyKey: "idem_safe_1",
        simulated: false,
      })
    ).rejects.toThrow(/PayPal credentials are not configured/);
  });

  it("allows simulated checkout ONLY when explicitly requested or enabled in environment", async () => {
    // 1. Explicit simulated: true parameter succeeds
    process.env.PAYMENTS_SIMULATED = "false";
    const explicitSim = await createOrder({
      planId: "plan_sim_1",
      approvalId: "appr_sim_1",
      amountMinor: 164900,
      currency: "USD",
      itemTitle: "Halden Vector 16",
      quantity: 1,
      idempotencyKey: "idem_sim_explicit",
      simulated: true,
    });
    expect(explicitSim.provider).toBe("SIMULATED");
    expect(explicitSim.providerOrderId).toMatch(/^SIM_ORDER_/);

    // 2. Environment PAYMENTS_SIMULATED="true" succeeds
    process.env.PAYMENTS_SIMULATED = "true";
    const envSim = await createOrder({
      planId: "plan_sim_2",
      approvalId: "appr_sim_2",
      amountMinor: 164900,
      currency: "USD",
      itemTitle: "Halden Vector 16",
      quantity: 1,
      idempotencyKey: "idem_sim_env",
    });
    expect(envSim.provider).toBe("SIMULATED");
  });

  it("ensures simulated payments can never be represented as real PayPal captures", async () => {
    const simOrder = await createOrder({
      planId: "plan_sim_3",
      approvalId: "appr_sim_3",
      amountMinor: 164900,
      currency: "USD",
      itemTitle: "Halden Vector 16",
      quantity: 1,
      idempotencyKey: "idem_sim_3",
      simulated: true,
    });

    const simCapture = await captureOrder({
      paymentId: simOrder.paymentId,
      providerOrderId: simOrder.providerOrderId,
      expectedAmountMinor: 164900,
      expectedCurrency: "USD",
      idempotencyKey: "idem_cap_sim_3",
      simulated: true,
    });

    expect(simCapture.status).toBe("COMPLETED");
    expect(simCapture.providerCaptureId).toMatch(/^SIM_CAP_/);
    expect(simOrder.provider).toBe("SIMULATED");
    // Ensure it is not labeled as PAYPAL provider
    expect(simOrder.provider).not.toBe("PAYPAL");
  });

  describe("Webhook Signature Verification", () => {
    it("accepts valid webhook signatures", async () => {
      const result = await verifyPayPalWebhookSignature({
        authAlgo: "SHA256withRSA",
        certUrl: "https://api.sandbox.paypal.com/cert",
        transmissionId: "trans_12345",
        transmissionSig: "VALID_TEST_SIG",
        transmissionTime: new Date().toISOString(),
        webhookId: "wh_test_99",
        rawPayload: JSON.stringify({ id: "WH-EVT-1", event_type: "PAYMENT.CAPTURE.COMPLETED" }),
      });

      expect(result.isValid).toBe(true);
    });

    it("rejects forged or missing webhook signatures with 401 Unauthorized", async () => {
      // 1. Direct function check
      const result = await verifyPayPalWebhookSignature({
        authAlgo: "SHA256withRSA",
        certUrl: "https://api.sandbox.paypal.com/cert",
        transmissionId: "trans_12345",
        transmissionSig: "FORGED_SIGNATURE",
        transmissionTime: new Date().toISOString(),
        webhookId: "wh_test_99",
        rawPayload: JSON.stringify({ id: "WH-EVT-FORGED" }),
      });
      expect(result.isValid).toBe(false);

      // 2. HTTP Route handler check
      const forgedReq = new NextRequest("http://localhost:3000/api/webhooks/paypal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "paypal-transmission-sig": "FORGED_SIGNATURE",
        },
        body: JSON.stringify({ id: "WH-EVT-FORGED", event_type: "PAYMENT.CAPTURE.COMPLETED" }),
      });

      const response = await webhookHandler(forgedReq);
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe("UNAUTHORIZED");
    });
  });
});
