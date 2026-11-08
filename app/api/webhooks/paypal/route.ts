import { NextRequest, NextResponse } from "next/server";
import { reconcileWebhookEvent } from "@/src/payments/reconcile";
import { verifyPayPalWebhookSignature } from "@/src/payments/paypal/webhook";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // 1. Verify PayPal Webhook Signature
  const signatureCheck = await verifyPayPalWebhookSignature({
    authAlgo: req.headers.get("paypal-auth-algo"),
    certUrl: req.headers.get("paypal-cert-url"),
    transmissionId: req.headers.get("paypal-transmission-id"),
    transmissionSig: req.headers.get("paypal-transmission-sig"),
    transmissionTime: req.headers.get("paypal-transmission-time"),
    rawPayload: rawBody,
  });

  if (!signatureCheck.isValid) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message:
          signatureCheck.reason || "Webhook signature verification failed",
      },
      { status: 401 }
    );
  }

  // 2. Parse Payload
  let eventPayload: {
    id?: string;
    event_type?: string;
    resource?: Record<string, unknown>;
  } = {};

  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON webhook payload" },
      { status: 400 }
    );
  }

  const eventId = eventPayload.id || `evt_${Date.now()}`;
  const eventType = eventPayload.event_type || "UNKNOWN";
  const resource = eventPayload.resource || {};

  // 3. Reconcile Webhook
  try {
    const result = await reconcileWebhookEvent(
      eventId,
      eventType,
      rawBody,
      resource
    );

    return NextResponse.json({
      received: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Reconciliation error",
      },
      { status: 500 }
    );
  }
}
