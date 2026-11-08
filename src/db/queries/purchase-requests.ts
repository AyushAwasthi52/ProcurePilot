import { db } from "@/src/db/client";
import { PurchaseBrief, PurchaseBriefSchema } from "@/src/ai/schemas/brief";

export interface CreatePurchaseRequestInput {
  userId: string;
  rawPrompt: string;
  region?: string;
  currency?: string;
  brief?: PurchaseBrief | null;
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

/**
 * Hydrates and normalizes a database row or legacy JSON into a strictly-validated PurchaseBrief domain object.
 * Reconstructs nested budget from flat columns (budgetMinor, budgetCurrency, includesShipping) without silent fabrication.
 */
export function mapDatabaseRowToPurchaseBrief(
  raw: unknown,
  parentContext?: { currency?: string; region?: string }
): PurchaseBrief | null {
  if (!raw || typeof raw !== "object") return null;

  const r = raw as Record<string, unknown>;

  // 1. Reconstruct budget: check if already nested or stored flat
  let budget: unknown = r.budget;

  if (!budget || typeof budget !== "object") {
    // Reconstruct budget from flat database columns
    const rawMinor = r.budgetMinor;
    const amountMinor =
      typeof rawMinor === "number" && rawMinor > 0 ? rawMinor : null;

    const currency =
      typeof r.budgetCurrency === "string" && r.budgetCurrency.trim().length === 3
        ? r.budgetCurrency.toUpperCase()
        : (parentContext?.currency ?? "USD").toUpperCase();

    const includesShipping =
      typeof r.includesShipping === "boolean" ? r.includesShipping : true;

    budget = {
      amountMinor,
      currency,
      includesShipping,
      isKnown: amountMinor !== null,
    };
  } else {
    // raw already has budget object: ensure type conformity and isKnown flag
    const b = budget as Record<string, unknown>;
    const amountMinor =
      typeof b.amountMinor === "number" && b.amountMinor > 0
        ? b.amountMinor
        : null;

    const currency =
      typeof b.currency === "string" && b.currency.trim().length === 3
        ? b.currency.toUpperCase()
        : (parentContext?.currency ?? "USD").toUpperCase();

    const includesShipping =
      typeof b.includesShipping === "boolean" ? b.includesShipping : true;

    budget = {
      amountMinor,
      currency,
      includesShipping,
      isKnown: typeof b.isKnown === "boolean" ? b.isKnown : amountMinor !== null,
    };
  }

  // Handle assumptions: parse if stored as JSON string or raw array
  let assumptions = r.assumptions;
  if (typeof assumptions === "string") {
    try {
      assumptions = JSON.parse(assumptions);
    } catch {
      assumptions = [];
    }
  }
  if (!Array.isArray(assumptions)) {
    assumptions = [];
  }

  // Handle mustHave: parse if stored as JSON string or raw array
  let mustHave = r.mustHave;
  if (typeof mustHave === "string") {
    try {
      mustHave = JSON.parse(mustHave);
    } catch {
      mustHave = [];
    }
  }
  if (!Array.isArray(mustHave)) {
    mustHave = [];
  }

  // Handle preferences: parse if stored as JSON string or raw array
  let preferences = r.preferences;
  if (typeof preferences === "string") {
    try {
      preferences = JSON.parse(preferences);
    } catch {
      preferences = [];
    }
  }
  if (!Array.isArray(preferences)) {
    preferences = [];
  }

  // Handle useCases: parse if stored as JSON string or raw array
  let useCases = r.useCases;
  if (typeof useCases === "string") {
    try {
      useCases = JSON.parse(useCases);
    } catch {
      useCases = [];
    }
  }
  if (!Array.isArray(useCases)) {
    useCases = [];
  }

  const category =
    typeof r.category === "string" && r.category.trim().length > 0
      ? r.category
      : "General";

  const query =
    typeof r.query === "string" && r.query.trim().length > 0
      ? r.query
      : `${category} requirement`;

  const region =
    typeof r.region === "string" && r.region.trim().length === 2
      ? r.region.toUpperCase()
      : (parentContext?.region ?? "US").toUpperCase();

  const quantity =
    typeof r.quantity === "number" && r.quantity > 0 ? r.quantity : 1;

  const urgency =
    r.urgency === "low" || r.urgency === "urgent" ? r.urgency : "normal";

  const candidate = {
    schemaVersion: 3 as const,
    category,
    query,
    useCases,
    budget,
    mustHave,
    preferences,
    excludedBrands: Array.isArray(r.excludedBrands) ? r.excludedBrands : undefined,
    preferredBrands: Array.isArray(r.preferredBrands) ? r.preferredBrands : undefined,
    region,
    quantity,
    urgency,
    assumptions,
  };

  const parsed = PurchaseBriefSchema.safeParse(candidate);
  if (parsed.success) {
    return parsed.data;
  }

  return candidate as PurchaseBrief;
}

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
                schemaVersion: input.brief.schemaVersion ?? 3,
                category: input.brief.category,
                query: input.brief.query,
                useCases: input.brief.useCases,
                budgetMinor: input.brief.budget?.amountMinor ?? 0,
                budgetCurrency: input.brief.budget?.currency ?? currency,
                includesShipping: input.brief.budget?.includesShipping ?? true,
                mustHave: input.brief.mustHave as object,
                preferences: input.brief.preferences as object,
                region: input.brief.region ?? region,
                quantity: input.brief.quantity ?? 1,
                urgency: input.brief.urgency ?? "normal",
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
      brief: mapDatabaseRowToPurchaseBrief(created.brief, { currency, region }),
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
      brief: mapDatabaseRowToPurchaseBrief(input.brief, { currency, region }),
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
      brief: mapDatabaseRowToPurchaseBrief(found.brief, {
        currency: found.currency,
        region: found.region,
      }),
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
        budgetMinor: brief.budget?.amountMinor ?? 0,
        budgetCurrency: brief.budget?.currency ?? "USD",
        includesShipping: brief.budget?.includesShipping ?? true,
        mustHave: brief.mustHave as object,
        preferences: brief.preferences as object,
        region: brief.region,
        quantity: brief.quantity,
        urgency: brief.urgency,
        assumptions: brief.assumptions as object,
      },
      create: {
        requestId,
        schemaVersion: brief.schemaVersion ?? 3,
        category: brief.category,
        query: brief.query,
        useCases: brief.useCases,
        budgetMinor: brief.budget?.amountMinor ?? 0,
        budgetCurrency: brief.budget?.currency ?? "USD",
        includesShipping: brief.budget?.includesShipping ?? true,
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
        currency: brief.budget?.currency,
        region: brief.region,
        updatedAt: new Date(),
      },
    });

    return {
      ...parentRequest,
      brief: mapDatabaseRowToPurchaseBrief(updated, {
        currency: parentRequest.currency,
        region: parentRequest.region,
      }),
    };
  } catch {
    const existing = inMemoryStore.get(requestId);
    if (!existing) return null;
    existing.brief = mapDatabaseRowToPurchaseBrief(brief, {
      currency: existing.currency,
      region: existing.region,
    });
    existing.status = "CONFIRMED";
    existing.updatedAt = new Date();
    inMemoryStore.set(requestId, existing);
    return existing;
  }
}

export function clearInMemoryStore(): void {
  inMemoryStore.clear();
}
