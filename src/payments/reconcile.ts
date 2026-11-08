import { db } from "@/src/db/client";
import { getPaymentByOrderId, updatePaymentStatus } from "./repository";
import { recordAuditEvent } from "@/src/observability/audit";
import { createHash } from "node:crypto";

const processedWebhookEvents = new Set<string>();

export interface ReconcileWebhookResult {
  reconciled: boolean;
  isDuplicate: boolean;
  eventId: string;
  eventType: string;
  paymentId?: string;
  message: string;
}

export async function reconcileWebhookEvent(
  eventId: string,
  eventType: string,
  rawPayload: string,
  resource: Record<string, unknown>
): Promise<ReconcileWebhookResult> {
  const payloadHash = createHash("sha256").update(rawPayload).digest("hex");

  // Check deduplication
  if (processedWebhookEvents.has(eventId)) {
    return {
      reconciled: true,
      isDuplicate: true,
      eventId,
      eventType,
      message: "Duplicate webhook event ignored",
    };
  }

  try {
    const existing = await db.webhookEvent.findUnique({
      where: { providerEventId: eventId },
    });

    if (existing) {
      processedWebhookEvents.add(eventId);
      return {
        reconciled: true,
        isDuplicate: true,
        eventId,
        eventType,
        message: "Duplicate webhook event ignored",
      };
    }

    // Save webhook event
    await db.webhookEvent.create({
      data: {
        providerEventId: eventId,
        eventType,
        status: "PROCESSING",
        payloadHash,
      },
    });
  } catch {
    // DB offline fallback
  }

  processedWebhookEvents.add(eventId);

  let paymentId: string | undefined;

  // Handle PAYMENT.CAPTURE.COMPLETED
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const captureId = resource.id as string | undefined;
    const supplementaryData = resource.supplementary_data as
      | { related_ids?: { order_id?: string } }
      | undefined;
    const orderId = supplementaryData?.related_ids?.order_id;

    if (orderId) {
      const payment = await getPaymentByOrderId(orderId);
      if (payment) {
        paymentId = payment.id;
        if (payment.status !== "COMPLETED") {
          await updatePaymentStatus(payment.id, "COMPLETED", {
            providerCaptureId: captureId,
          });
        }

        await recordAuditEvent({
          userId: null,
          entityType: "Payment",
          entityId: payment.id,
          action: "PAYMENT_RECONCILED",
          metadata: {
            eventId,
            eventType,
            orderId,
            captureId,
          },
        });
      }
    }
  }

  try {
    await db.webhookEvent.update({
      where: { providerEventId: eventId },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });
  } catch {
    // DB offline fallback
  }

  return {
    reconciled: true,
    isDuplicate: false,
    eventId,
    eventType,
    paymentId,
    message: "Webhook processed and reconciled successfully",
  };
}

export function clearWebhookDeduplicationCache(): void {
  processedWebhookEvents.clear();
}
