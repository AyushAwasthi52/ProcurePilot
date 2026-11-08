import { db } from "@/src/db/client";
import { PriceObservation, PriceAdviceResult } from "./types";
import { computePriceStatistics } from "./statistics";
import { evaluateBuyAdvice } from "./rules";

// In-memory fallback for unit tests and offline operation
const inMemorySnapshots = new Map<string, PriceObservation[]>();

export async function recordSnapshot(
  observation: PriceObservation
): Promise<PriceObservation> {
  try {
    const created = await db.priceSnapshot.create({
      data: {
        offerId: observation.offerId,
        amountMinor: observation.amountMinor,
        currency: observation.currency,
        availability: observation.availability,
        sourceObservedAt: observation.sourceObservedAt,
        ingestedAt: observation.ingestedAt,
        source: observation.source,
      },
    });

    return {
      id: created.id,
      offerId: created.offerId,
      amountMinor: created.amountMinor,
      currency: created.currency,
      availability: created.availability,
      sourceObservedAt: created.sourceObservedAt,
      ingestedAt: created.ingestedAt,
      source: created.source,
    };
  } catch {
    const existing = inMemorySnapshots.get(observation.offerId) || [];
    const record: PriceObservation = {
      ...observation,
      id: `snp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    existing.push(record);
    inMemorySnapshots.set(observation.offerId, existing);
    return record;
  }
}

export async function getOfferSnapshots(
  offerId: string
): Promise<PriceObservation[]> {
  try {
    const records = await db.priceSnapshot.findMany({
      where: { offerId },
      orderBy: { sourceObservedAt: "asc" },
    });

    if (records.length > 0) {
      return records.map((r) => ({
        id: r.id,
        offerId: r.offerId,
        amountMinor: r.amountMinor,
        currency: r.currency,
        availability: r.availability,
        sourceObservedAt: r.sourceObservedAt,
        ingestedAt: r.ingestedAt,
        source: r.source,
      }));
    }
  } catch {
    // Fall back to in-memory
  }

  return inMemorySnapshots.get(offerId) || [];
}

export async function getOfferPriceIntelligence(
  offerId: string,
  currentPriceMinor: number,
  currency: string,
  urgency: "low" | "normal" | "urgent" = "normal"
): Promise<PriceAdviceResult> {
  const snapshots = await getOfferSnapshots(offerId);
  const statistics = computePriceStatistics(snapshots, currentPriceMinor, currency);
  return evaluateBuyAdvice(statistics, urgency);
}

export function seedInMemorySnapshots(
  offerId: string,
  snapshots: PriceObservation[]
): void {
  inMemorySnapshots.set(offerId, snapshots);
}

export function clearInMemorySnapshots(): void {
  inMemorySnapshots.clear();
}

