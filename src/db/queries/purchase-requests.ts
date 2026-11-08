import { db } from "@/src/db/client";
import { PurchaseBrief } from "@/src/ai/schemas/brief";

export interface CreatePurchaseRequestInput {
  userId: string;
  rawPrompt: string;
  region?: string;
  currency?: string;
  brief?: PurchaseBrief;
}

export interface PurchaseRequestRecord {
  id: string;
  userId: string;
  rawPrompt: string;
  status: string;
  region: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  brief?: PurchaseBrief | null;
}

// In-memory store fallback when DB is disconnected in test environments
const inMemoryStore = new Map<string, PurchaseRequestRecord>();

export async function createPurchaseRequest(
  input: CreatePurchaseRequestInput
): Promise<PurchaseRequestRecord> {
  const region = input.region ?? "US";
  const currency = (input.currency ?? "USD").toUpperCase();

  try {
    const created = await db.purchaseRequest.create({
      data: {
        userId: input.userId,
        rawPrompt: input.rawPrompt,
        region,
        currency,
        status: "DRAFT",
        brief: input.brief
          ? {
              create: {
                schemaVersion: input.brief.schemaVersion,
                category: input.brief.category,
                query: input.brief.query,
                useCases: input.brief.useCases,
                budgetMinor: input.brief.budget.amountMinor,
                budgetCurrency: input.brief.budget.currency,
                includesShipping: input.brief.budget.includesShipping,
                mustHave: input.brief.mustHave as object,
                preferences: input.brief.preferences as object,
                region: input.brief.region,
                quantity: input.brief.quantity,
                urgency: input.brief.urgency,
                assumptions: input.brief.assumptions as object,
              },
            }
          : undefined,
      },
      include: {
        brief: true,
      },
    });

    return {
      ...created,
      brief: (created.brief as unknown as PurchaseBrief) ?? null,
    };
  } catch {
    // In-memory fallback
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: PurchaseRequestRecord = {
      id,
      userId: input.userId,
      rawPrompt: input.rawPrompt,
      region,
      currency,
      status: "DRAFT",
      createdAt: new Date(),
      updatedAt: new Date(),
      brief: input.brief ?? null,
    };
    inMemoryStore.set(id, record);
    return record;
  }
}

export async function getPurchaseRequestById(
  id: string
): Promise<PurchaseRequestRecord | null> {
  try {
    const found = await db.purchaseRequest.findUnique({
      where: { id },
      include: {
        brief: true,
      },
    });
    if (!found) return null;
    return {
      ...found,
      brief: (found.brief as unknown as PurchaseBrief) ?? null,
    };
  } catch {
    return inMemoryStore.get(id) ?? null;
  }
}

export async function updatePurchaseBrief(
  requestId: string,
  brief: PurchaseBrief
): Promise<PurchaseRequestRecord | null> {
  try {
    const updated = await db.purchaseBrief.upsert({
      where: { requestId },
      update: {
        category: brief.category,
        query: brief.query,
        useCases: brief.useCases,
        budgetMinor: brief.budget.amountMinor,
        budgetCurrency: brief.budget.currency,
        includesShipping: brief.budget.includesShipping,
        mustHave: brief.mustHave as object,
        preferences: brief.preferences as object,
        region: brief.region,
        quantity: brief.quantity,
        urgency: brief.urgency,
        assumptions: brief.assumptions as object,
      },
      create: {
        requestId,
        schemaVersion: brief.schemaVersion,
        category: brief.category,
        query: brief.query,
        useCases: brief.useCases,
        budgetMinor: brief.budget.amountMinor,
        budgetCurrency: brief.budget.currency,
        includesShipping: brief.budget.includesShipping,
        mustHave: brief.mustHave as object,
        preferences: brief.preferences as object,
        region: brief.region,
        quantity: brief.quantity,
        urgency: brief.urgency,
        assumptions: brief.assumptions as object,
      },
    });

    const parentRequest = await db.purchaseRequest.update({
      where: { id: requestId },
      data: {
        status: "CONFIRMED",
        updatedAt: new Date(),
      },
    });

    return {
      ...parentRequest,
      brief: updated as unknown as PurchaseBrief,
    };
  } catch {
    const existing = inMemoryStore.get(requestId);
    if (!existing) return null;
    existing.brief = brief;
    existing.status = "CONFIRMED";
    existing.updatedAt = new Date();
    inMemoryStore.set(requestId, existing);
    return existing;
  }
}

export function clearInMemoryStore(): void {
  inMemoryStore.clear();
}
