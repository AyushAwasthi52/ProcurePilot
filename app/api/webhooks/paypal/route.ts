import { NextRequest, NextResponse } from "next/server";
import { reconcileWebhookEvent } from "@/src/payments/reconcile";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
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
      { error: error instanceof Error ? error.message : "Reconciliation error" },
      { status: 500 }
    );
  }
}
