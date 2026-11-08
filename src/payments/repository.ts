import { db } from "@/src/db/client";
import { PaymentRecord, PaymentStatus, PaymentProvider } from "./types";
import { PaymentStatus as PrismaPaymentStatus } from "@prisma/client";
import { assertValidTransition } from "./state-machine";

const inMemoryPayments = new Map<string, PaymentRecord>();

export async function createPayment(data: {
  id?: string;
  planId: string;
  approvalId: string;
  provider: PaymentProvider;
  providerOrderId: string;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
}): Promise<PaymentRecord> {
  const paymentId =
    data.id ??
    `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date();

  const record: PaymentRecord = {
    id: paymentId,
    planId: data.planId,
    approvalId: data.approvalId,
    provider: data.provider,
    providerOrderId: data.providerOrderId,
    providerCaptureId: null,
    status: data.status,
    amountMinor: data.amountMinor,
    currency: data.currency.toUpperCase(),
    idempotencyKey: data.idempotencyKey,
    failureCode: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.payment.create({
      data: {
        id: record.id,
        planId: record.planId,
        approvalId: record.approvalId,
        provider: record.provider,
        providerOrderId: record.providerOrderId,
        providerCaptureId: record.providerCaptureId,
        status: record.status as PrismaPaymentStatus,
        amountMinor: record.amountMinor,
        currency: record.currency,
        idempotencyKey: record.idempotencyKey,
        version: record.version,
        createdAt: record.createdAt,
      },
    });
  } catch {
    // DB offline fallback
  }

  inMemoryPayments.set(record.id, record);
  return record;
}

export async function getPayment(id: string): Promise<PaymentRecord | null> {
  try {
    const p = await db.payment.findUnique({ where: { id } });
    if (p) {
      return {
        id: p.id,
        planId: p.planId,
        approvalId: p.approvalId,
        provider: p.provider as PaymentProvider,
        providerOrderId: p.providerOrderId,
        providerCaptureId: p.providerCaptureId,
        status: p.status as PaymentStatus,
        amountMinor: p.amountMinor,
        currency: p.currency,
        idempotencyKey: p.idempotencyKey,
        failureCode: p.failureCode,
        version: p.version,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    }
  } catch {
    // DB offline fallback
  }

  return inMemoryPayments.get(id) || null;
}

export async function getPaymentByOrderId(
  providerOrderId: string
): Promise<PaymentRecord | null> {
  try {
    const p = await db.payment.findUnique({
      where: { providerOrderId },
    });
    if (p) {
      return {
        id: p.id,
        planId: p.planId,
        approvalId: p.approvalId,
        provider: p.provider as PaymentProvider,
        providerOrderId: p.providerOrderId,
        providerCaptureId: p.providerCaptureId,
        status: p.status as PaymentStatus,
        amountMinor: p.amountMinor,
        currency: p.currency,
        idempotencyKey: p.idempotencyKey,
        failureCode: p.failureCode,
        version: p.version,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    }
  } catch {
    // DB offline fallback
  }

  for (const record of inMemoryPayments.values()) {
    if (record.providerOrderId === providerOrderId) {
      return record;
    }
  }
  return null;
}

export async function getPaymentByIdempotencyKey(
  idempotencyKey: string
): Promise<PaymentRecord | null> {
  try {
    const p = await db.payment.findUnique({
      where: { idempotencyKey },
    });
    if (p) {
      return {
        id: p.id,
        planId: p.planId,
        approvalId: p.approvalId,
        provider: p.provider as PaymentProvider,
        providerOrderId: p.providerOrderId,
        providerCaptureId: p.providerCaptureId,
        status: p.status as PaymentStatus,
        amountMinor: p.amountMinor,
        currency: p.currency,
        idempotencyKey: p.idempotencyKey,
        failureCode: p.failureCode,
        version: p.version,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    }
  } catch {
    // DB offline fallback
  }

  for (const record of inMemoryPayments.values()) {
    if (record.idempotencyKey === idempotencyKey) {
      return record;
    }
  }
  return null;
}

export async function updatePaymentStatus(
  id: string,
  newStatus: PaymentStatus,
  options?: {
    providerCaptureId?: string;
    failureCode?: string;
  }
): Promise<PaymentRecord> {
  const current = await getPayment(id);
  if (!current) {
    throw new Error(`Payment ${id} not found`);
  }

  assertValidTransition(current.status, newStatus);

  const updated: PaymentRecord = {
    ...current,
    status: newStatus,
    providerCaptureId: options?.providerCaptureId ?? current.providerCaptureId,
    failureCode: options?.failureCode ?? current.failureCode,
    version: current.version + 1,
    updatedAt: new Date(),
  };

  try {
    await db.payment.update({
      where: { id },
      data: {
        status: newStatus as PrismaPaymentStatus,
        providerCaptureId: updated.providerCaptureId,
        failureCode: updated.failureCode,
        version: { increment: 1 },
      },
    });
  } catch {
    // DB offline fallback
  }

  inMemoryPayments.set(id, updated);
  return updated;
}

export function clearInMemoryPayments(): void {
  inMemoryPayments.clear();
}
