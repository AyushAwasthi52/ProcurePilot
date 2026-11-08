import { z } from "zod";

export const MustHaveOperatorSchema = z.enum([
  "eq",
  "gte",
  "lte",
  "in",
  "exists",
]);

export const MustHaveConstraintSchema = z.object({
  id: z.string().optional(),
  attribute: z.string(),
  operator: MustHaveOperatorSchema,
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
  ]),
  confirmed: z.boolean().default(true),
  provenance: z
    .enum(["you-said", "confirm", "inferred"])
    .default("you-said"),
  label: z.string().optional(),
});

export const PreferenceWeightSchema = z.object({
  attribute: z.string(),
  label: z.string().optional(),
  weight: z.number().min(0).max(100),
  preferredValues: z.array(z.string()).optional(),
});

export const BudgetSchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3),
  includesShipping: z.boolean().default(true),
});

export const AssumptionSchema = z.object({
  field: z.string(),
  value: z.string(),
  origin: z.enum(["inferred", "default"]),
});

export const PurchaseBriefSchema = z.object({
  category: z.string().min(1),
  query: z.string().min(1),
  useCases: z.array(z.string()).default([]),
  budget: BudgetSchema,
  mustHave: z.array(MustHaveConstraintSchema).default([]),
  preferences: z.array(PreferenceWeightSchema).default([]),
  excludedBrands: z.array(z.string()).optional(),
  preferredBrands: z.array(z.string()).optional(),
  region: z.string().length(2).default("US"),
  quantity: z.number().int().min(1).default(1),
  urgency: z.enum(["low", "normal", "urgent"]).default("normal"),
  assumptions: z.array(AssumptionSchema).default([]),
  schemaVersion: z.literal(3).default(3),
});

export type MustHaveConstraint = z.infer<typeof MustHaveConstraintSchema>;
export type PreferenceWeight = z.infer<typeof PreferenceWeightSchema>;
export type Budget = z.infer<typeof BudgetSchema>;
export type Assumption = z.infer<typeof AssumptionSchema>;
export type PurchaseBrief = z.infer<typeof PurchaseBriefSchema>;
