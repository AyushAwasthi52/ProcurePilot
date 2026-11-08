import { Approval, PlanApprovalSubmission, PurchasePlan } from "./types";
import { isPlanExpired, verifyPlanHash } from "./plan";

export interface ApprovalValidationResult {
  valid: boolean;
  errorCode?:
    | "PLAN_EXPIRED"
    | "PLAN_INACTIVE"
    | "PLAN_HASH_MISMATCH"
    | "AMOUNT_MISMATCH"
    | "CURRENCY_MISMATCH"
    | "INTEGRITY_VIOLATION";
  errorMessage?: string;
}

export function validatePlanApproval(
  plan: PurchasePlan,
  submission: PlanApprovalSubmission,
  asOf: Date = new Date()
): ApprovalValidationResult {
  // 1. Verify plan integrity (has the plan itself been tampered with?)
  if (!verifyPlanHash(plan)) {
    return {
      valid: false,
      errorCode: "INTEGRITY_VIOLATION",
      errorMessage: "The purchase plan fails cryptographic integrity check.",
    };
  }

  // 2. Verify plan is ACTIVE
  if (plan.status !== "ACTIVE") {
    return {
      valid: false,
      errorCode: "PLAN_INACTIVE",
      errorMessage: `This purchase plan is ${plan.status.toLowerCase()} and cannot be approved.`,
    };
  }

  // 3. Verify TTL / Expiry
  if (isPlanExpired(plan, asOf)) {
    return {
      valid: false,
      errorCode: "PLAN_EXPIRED",
      errorMessage: "This purchase plan has expired. Please refresh the plan to continue.",
    };
  }

  // 4. Verify Plan Hash Binding (Section 7.3 & ADR-004)
  if (submission.planHash !== plan.planHash) {
    return {
      valid: false,
      errorCode: "PLAN_HASH_MISMATCH",
      errorMessage: "Approval hash does not match the current plan hash. The plan terms may have changed.",
    };
  }

  // 5. Verify Exact Approved Amount
  if (submission.approvedAmountMinor !== plan.totalKnownMinor) {
    return {
      valid: false,
      errorCode: "AMOUNT_MISMATCH",
      errorMessage: `Approved amount (${submission.approvedAmountMinor}) does not match plan total (${plan.totalKnownMinor}).`,
    };
  }

  // 6. Verify Currency
  if (
    submission.approvedCurrency.toUpperCase() !== plan.currency.toUpperCase()
  ) {
    return {
      valid: false,
      errorCode: "CURRENCY_MISMATCH",
      errorMessage: `Approved currency (${submission.approvedCurrency}) does not match plan currency (${plan.currency}).`,
    };
  }

  return { valid: true };
}

export function buildApprovalRecord(
  plan: PurchasePlan,
  submission: PlanApprovalSubmission,
  userId: string,
  approvalId?: string
): Approval {
  const id =
    approvalId ??
    `appr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    planId: plan.id,
    userId,
    planHash: submission.planHash,
    approvedAmountMinor: submission.approvedAmountMinor,
    approvedCurrency: submission.approvedCurrency.toUpperCase(),
    acknowledgedUnverified: submission.acknowledgedUnverified ?? [],
    status: "APPROVED",
    approvedAt: new Date(),
    revokedAt: null,
  };
}

