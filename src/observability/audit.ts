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
    return {
      id: `aud_${Date.now()}`,
      ...data,
      metadata,
      createdAt: new Date(),
    };
  }
}

export async function getAuditTrail(entityType: string, entityId: string) {
  try {
    return await db.auditEvent.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  } catch {
    return [];
  }
}
