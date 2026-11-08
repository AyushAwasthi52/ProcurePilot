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
    {
      name: "material",
      label: "Material",
      type: "string",
    },
    {
      name: "connectivity",
      label: "Connectivity",
      type: "string",
    },
    {
      name: "ergonomics",
      label: "Ergonomics / Adjustability",
      type: "boolean",
    },
  ],

  defaultPreferences: [
    { attribute: "qualityFit", label: "Specification fit", weight: 40 },
    { attribute: "priceValue", label: "Value for money", weight: 30 },
    { attribute: "reliability", label: "Seller reliability", weight: 20 },
    { attribute: "warrantyReturns", label: "Warranty & returns", weight: 10 },
  ],

  clarificationQuestions: {
    category: {
      id: "clarify_category",
      attribute: "category",
      question: "Which product category best matches your purchase requirement?",
      context: "We detected general or ambiguous purchasing terms.",
      options: [
        { id: "opt_cat_laptop", label: "Laptop / Computer", value: "Laptop" },
        { id: "opt_cat_headphones", label: "Headphones / Audio", value: "Headphones" },
        { id: "opt_cat_smartphone", label: "Smartphone / Mobile", value: "Smartphone" },
        { id: "opt_cat_monitor", label: "Monitor / Display", value: "Monitor" },
        { id: "opt_cat_general", label: "General Equipment / Other", value: "General" },
      ],
    },
  },
};
