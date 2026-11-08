import { db } from "@/src/db/client";
import { logger } from "./logger";

export interface AuditEventData {
  userId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
}

// In-memory fallback for testing and offline environments
const inMemoryAuditEvents: Array<AuditEventData & { id: string; createdAt: Date }> = [];

export async function recordAuditEvent(data: AuditEventData) {
  const metadata = data.metadata ?? {};
  
  // Structured logging
  logger.info(`[AUDIT] ${data.entityType}:${data.entityId} ${data.action}`, {
    requestId: data.requestId ?? undefined,
    entityType: data.entityType,
    entityId: data.entityId,
    action: data.action,
    metadata,
  });

  const fallbackEvent = {
    id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...data,
    metadata,
    createdAt: new Date(),
  };
  inMemoryAuditEvents.push(fallbackEvent);

  try {
    const event = await db.auditEvent.create({
      data: {
        userId: data.userId ?? null,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        metadata: metadata as object,
        requestId: data.requestId ?? null,
      },
    });
    return event;
  } catch (error) {
    // Audit logging in append-only fallback: log warning but never throw out of workflow
    logger.warn(`Failed to persist audit event to DB: ${String(error)}`, {
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
    });
    return fallbackEvent;
  }
}

export async function getAuditTrail(entityType: string, entityId: string) {
  try {
    const dbEvents = await db.auditEvent.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    if (dbEvents.length > 0) return dbEvents;
  } catch {
    // DB offline fallback
  }

  return inMemoryAuditEvents.filter(
    (e) => e.entityType === entityType && e.entityId === entityId
  );
}

export function clearInMemoryAuditTrail(): void {
  inMemoryAuditEvents.length = 0;
}

