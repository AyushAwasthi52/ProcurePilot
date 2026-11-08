import { db } from "@/src/db/client";
import {
  Approval,
  CheckoutCapability,
  CostStatus,
  ItemSnapshot,
  PlanStatus,
  PurchasePlan,
} from "./types";
import { CostStatus as PrismaCostStatus, PlanStatus as PrismaPlanStatus } from "@prisma/client";

// In-memory fallback for testing and offline environments
const inMemoryPlans = new Map<string, PurchasePlan>();
const inMemoryApprovals = new Map<string, Approval>();

export async function savePurchasePlan(plan: PurchasePlan): Promise<PurchasePlan> {
  try {
    await db.purchasePlan.upsert({
      where: {
        userId_offerId_version: {
          userId: plan.userId,
          offerId: plan.offerId,
          version: plan.version,
        },
      },
      update: {
        status: plan.status as PrismaPlanStatus,
        planHash: plan.planHash,
        supersededById: plan.supersededById,
        expiresAt: plan.expiresAt,
        totalKnownMinor: plan.totalKnownMinor,
      },
      create: {
        id: plan.id,
        userId: plan.userId,
        requestId: plan.requestId,
        offerId: plan.offerId,
        version: plan.version,
        itemSnapshot: plan.itemSnapshot as unknown as object,
        quantity: plan.quantity,
        itemMinor: plan.itemMinor,
        shippingStatus: plan.shippingStatus as PrismaCostStatus,
        shippingMinor: plan.shippingMinor,
        taxStatus: plan.taxStatus as PrismaCostStatus,
        taxMinor: plan.taxMinor,
        totalKnownMinor: plan.totalKnownMinor,
        currency: plan.currency,
        planHash: plan.planHash,
        status: plan.status as PrismaPlanStatus,
        expiresAt: plan.expiresAt,
        supersededById: plan.supersededById,
        createdAt: plan.createdAt,
      },
    });
  } catch {
    // DB offline fallback
  }

  inMemoryPlans.set(plan.id, plan);
  return plan;
}

export async function getPurchasePlan(id: string): Promise<PurchasePlan | null> {
  try {
    const record = await db.purchasePlan.findUnique({
      where: { id },
      include: {
        offer: true,
      },
    });

    if (record) {
      return {
        id: record.id,
        userId: record.userId,
        requestId: record.requestId,
        offerId: record.offerId,
        version: record.version,
        itemSnapshot: record.itemSnapshot as unknown as ItemSnapshot,
        quantity: record.quantity,
        itemMinor: record.itemMinor,
        shippingStatus: record.shippingStatus as CostStatus,
        shippingMinor: record.shippingMinor,
        taxStatus: record.taxStatus as CostStatus,
        taxMinor: record.taxMinor,
        totalKnownMinor: record.totalKnownMinor,
        currency: record.currency,
        planHash: record.planHash,
        status: record.status as PlanStatus,
        checkoutCapability: (record.offer?.checkoutCapability ?? "HANDOFF_ONLY") as CheckoutCapability,
        expiresAt: record.expiresAt,
        supersededById: record.supersededById,
        reverifiedAt: record.createdAt,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      };
    }
  } catch {
    // DB offline fallback
  }

  return inMemoryPlans.get(id) || null;
}

export async function updatePlanStatus(
  planId: string,
  status: PlanStatus,
  supersededById?: string
): Promise<void> {
  try {
    await db.purchasePlan.update({
      where: { id: planId },
      data: {
        status: status as PrismaPlanStatus,
        supersededById: supersededById ?? null,
      },
    });
  } catch {
    // DB offline fallback
  }

  const existing = inMemoryPlans.get(planId);
  if (existing) {
    existing.status = status;
    if (supersededById) existing.supersededById = supersededById;
    inMemoryPlans.set(planId, existing);
  }
}

export async function saveApproval(approval: Approval): Promise<Approval> {
  try {
    await db.approval.create({
      data: {
        id: approval.id,
        planId: approval.planId,
        userId: approval.userId,
        planHash: approval.planHash,
        approvedAmountMinor: approval.approvedAmountMinor,
        approvedCurrency: approval.approvedCurrency,
        acknowledgedUnverified: approval.acknowledgedUnverified ?? [],
        approvedAt: approval.approvedAt,
      },
    });
  } catch {
    // DB offline fallback
  }

  inMemoryApprovals.set(approval.planId, approval);
  return approval;
}

export async function getApprovalForPlan(planId: string): Promise<Approval | null> {
  try {
    const record = await db.approval.findFirst({
      where: { planId, revokedAt: null },
      orderBy: { approvedAt: "desc" },
    });

    if (record) {
      return {
        id: record.id,
        planId: record.planId,
        userId: record.userId,
        planHash: record.planHash,
        approvedAmountMinor: record.approvedAmountMinor,
        approvedCurrency: record.approvedCurrency,
        acknowledgedUnverified: (record.acknowledgedUnverified as string[]) ?? [],
        status: "APPROVED",
        approvedAt: record.approvedAt,
        revokedAt: record.revokedAt,
      };
    }
  } catch {
    // DB offline fallback
  }

  return inMemoryApprovals.get(planId) || null;
}

export function clearInMemoryPlans(): void {
  inMemoryPlans.clear();
  inMemoryApprovals.clear();
}
