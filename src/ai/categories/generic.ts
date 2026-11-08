import { CategoryDefinition } from "./types";

export const GENERIC_CATEGORY: CategoryDefinition = {
  id: "General",
  label: "General Procurement",
  aliases: ["general", "other", "equipment", "appliance", "furniture", "device"],
  attributes: [
    {
      name: "warrantyMonths",
      label: "Warranty",
      type: "number",
      unit: "months",
    },
    {
      name: "condition",
      label: "Condition",
      type: "string",
    },
  ],

  defaultPreferences: [
    { attribute: "qualityFit", label: "Specification fit", weight: 40 },
    { attribute: "priceValue", label: "Value for money", weight: 30 },
    { attribute: "reliability", label: "Seller reliability", weight: 20 },
    { attribute: "warrantyReturns", label: "Warranty & returns", weight: 10 },
  ],

  clarificationQuestions: {},
};
