export type MustHaveOperator = "eq" | "gte" | "lte" | "in" | "exists";

export interface MustHaveConstraint {
  id?: string;
  attribute: string;
  operator: MustHaveOperator;
  value: string | number | boolean | string[];
  confirmed?: boolean;
  provenance?: "you-said" | "confirm" | "inferred";
  label?: string;
}

export interface PreferenceWeight {
  attribute: string;
  label?: string;
  weight: number;
  preferredValues?: string[];
}

export interface Budget {
  amountMinor: number;
  currency: string;
  includesShipping: boolean;
}

export interface Assumption {
  field: string;
  value: string;
  origin: "inferred" | "default";
}

export interface PurchaseBrief {
  category: string;
  query: string;
  useCases: string[];
  budget: Budget;
  mustHave: MustHaveConstraint[];
  preferences: PreferenceWeight[];
  excludedBrands?: string[];
  preferredBrands?: string[];
  region: string;
  quantity: number;
  urgency: "low" | "normal" | "urgent";
  assumptions: Assumption[];
  schemaVersion: 3;
}
