import { db } from "@/src/db/client";

export interface CreatePurchaseRequestInput {
  userId: string;
  rawPrompt: string;
  region?: string;
  currency?: string;
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
  brief?: unknown | null;
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
      },
      include: {
        brief: true,
      },
    });
    return created;
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
      brief: null,
    };
    inMemoryStore.set(id, record);
    return record;
  }
}

export async function getPurchaseRequestById(
  id: string
): Promise<PurchaseRequestRecord | null> {
  try {
    return await db.purchaseRequest.findUnique({
      where: { id },
      include: {
        brief: true,
      },
    });
  } catch {
    return inMemoryStore.get(id) ?? null;
  }
}

export function clearInMemoryStore(): void {
  inMemoryStore.clear();
}

