import { MustHaveConstraint, Budget } from "../purchase/types";
import { NormalizedOffer } from "../catalog/types";

export type ConstraintStatus = "PASS" | "FAIL" | "UNVERIFIED";

export interface ConstraintEvaluationResult {
  constraintId: string;
  attribute: string;
  status: ConstraintStatus;
  expected: string;
  actual?: string | number | boolean | null;
  message?: string;
}

export interface OfferConstraintSummary {
  eligible: boolean;
  isOverBudget: boolean;
  hasUnverified: boolean;
  unverifiedAttributes: string[];
  results: Record<string, ConstraintStatus>;
  details: ConstraintEvaluationResult[];
}

export function evaluateConstraint(
  constraint: MustHaveConstraint,
  offer: NormalizedOffer
): ConstraintEvaluationResult {
  const attrKey = constraint.attribute;
  const id = constraint.id || attrKey;
  const rawActual =
    offer.attributes && offer.attributes[attrKey] !== undefined
      ? offer.attributes[attrKey]
      : (offer as unknown as Record<string, unknown>)[attrKey];

  const actualVal =
    rawActual !== undefined && rawActual !== null
      ? (rawActual as string | number | boolean)
      : null;

  // If attribute is missing, null, or undefined -> UNVERIFIED
  if (actualVal === undefined || actualVal === null) {
    return {
      constraintId: id,
      attribute: attrKey,
      status: "UNVERIFIED",
      expected: `${constraint.operator} ${String(constraint.value)}`,
      actual: null,
      message: `Attribute ${attrKey} is missing or not checkable from provider`,
    };
  }

  let pass = false;
  const expectedVal = constraint.value;

  switch (constraint.operator) {
    case "eq":
      pass = actualVal === expectedVal;
      break;
    case "gte":
      pass = typeof actualVal === "number" && typeof expectedVal === "number" && actualVal >= expectedVal;
      break;
    case "lte":
      pass = typeof actualVal === "number" && typeof expectedVal === "number" && actualVal <= expectedVal;
      break;
    case "in":
      if (Array.isArray(expectedVal)) {
        pass = expectedVal.includes(String(actualVal));
      }
      break;
    case "exists":
      pass = actualVal !== undefined && actualVal !== null;
      break;
  }

  return {
    constraintId: id,
    attribute: attrKey,
    status: pass ? "PASS" : "FAIL",
    expected: `${constraint.operator} ${String(expectedVal)}`,
    actual: actualVal,
    message: pass ? "Satisfied" : `Failed constraint (${actualVal} does not satisfy ${constraint.operator} ${expectedVal})`,
  };
}

export function evaluateOfferConstraints(
  briefMustHaves: MustHaveConstraint[] = [],
  budget: Budget,
  offer: NormalizedOffer
): OfferConstraintSummary {
  const details: ConstraintEvaluationResult[] = [];
  const results: Record<string, ConstraintStatus> = {};
  const unverifiedAttributes: string[] = [];

  const mustHaves = Array.isArray(briefMustHaves) ? briefMustHaves : [];

  // 1. Evaluate user must-haves
  let anyUserFail = false;
  for (const mh of mustHaves) {
    const res = evaluateConstraint(mh, offer);
    details.push(res);
    results[res.attribute] = res.status;

    if (res.status === "FAIL") {
      anyUserFail = true;
    } else if (res.status === "UNVERIFIED") {
      unverifiedAttributes.push(res.attribute);
    }
  }

  // 2. Evaluate hard budget constraint (Section 6.3)
  const budgetCapMinor = budget?.amountMinor;
  let budgetStatus: ConstraintStatus = "PASS";

  if (budgetCapMinor === null || budgetCapMinor === undefined) {
    // Budget is unknown / not specified -> all offers within budget, but constraint marked UNVERIFIED
    budgetStatus = "UNVERIFIED";
  } else if (offer.priceMinor > budgetCapMinor) {
    // Item price alone exceeds cap -> hard FAIL
    budgetStatus = "FAIL";
  } else if (offer.totalKnownMinor > budgetCapMinor) {
    // Total known cost exceeds cap -> hard FAIL
    budgetStatus = "FAIL";
  } else if (offer.shippingStatus === "UNKNOWN" && budget?.includesShipping) {
    // Price under cap, but shipping unknown -> UNVERIFIED
    budgetStatus = "UNVERIFIED";
    unverifiedAttributes.push("shippingCost");
  } else {
    budgetStatus = "PASS";
  }

  results["budget"] = budgetStatus;
  const isZeroDecimal = (budget?.currency || "USD").toUpperCase() === "JPY";
  const factor = isZeroDecimal ? 1 : 100;
  details.push({
    constraintId: "budget",
    attribute: "budget",
    status: budgetStatus,
    expected: budgetCapMinor ? `<= ${budgetCapMinor} ${budget?.currency ?? "USD"}` : "No budget cap set",
    actual: `${offer.totalKnownMinor} ${offer.currency}`,
    message:
      budgetCapMinor === null || budgetCapMinor === undefined
        ? "No budget cap set — all candidate prices eligible"
        : budgetStatus === "FAIL"
        ? `${budget?.currency ?? "$"}${((offer.totalKnownMinor - budgetCapMinor) / factor).toFixed(isZeroDecimal ? 0 : 2)} over budget cap`
        : budgetStatus === "UNVERIFIED"
        ? "Item price under cap, but shipping cost is unknown"
        : "Within budget",
  });

  const isOverBudget = budgetStatus === "FAIL";
  const eligible = !anyUserFail && !isOverBudget;
  const hasUnverified = unverifiedAttributes.length > 0;

  return {
    eligible,
    isOverBudget,
    hasUnverified,
    unverifiedAttributes,
    results,
    details,
  };
}
