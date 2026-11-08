import { CategoryDefinition } from "./types";
import { LAPTOP_CATEGORY } from "./laptops";
import { HEADPHONES_CATEGORY } from "./headphones";
import { SMARTPHONES_CATEGORY } from "./smartphones";
import { MONITORS_CATEGORY } from "./monitors";
import { KEYBOARD_CATEGORY } from "./keyboard";
import { FURNITURE_CATEGORY } from "./furniture";
import { FOOTWEAR_CATEGORY } from "./footwear";
import { APPLIANCES_CATEGORY } from "./appliances";
import { GENERIC_CATEGORY } from "./generic";

export * from "./types";
export * from "./laptops";
export * from "./headphones";
export * from "./smartphones";
export * from "./monitors";
export * from "./keyboard";
export * from "./furniture";
export * from "./footwear";
export * from "./appliances";
export * from "./generic";

export const ALL_CATEGORIES: CategoryDefinition[] = [
  LAPTOP_CATEGORY,
  HEADPHONES_CATEGORY,
  SMARTPHONES_CATEGORY,
  MONITORS_CATEGORY,
  KEYBOARD_CATEGORY,
  FURNITURE_CATEGORY,
  FOOTWEAR_CATEGORY,
  APPLIANCES_CATEGORY,
  GENERIC_CATEGORY,
];

export function getCategoryDefinition(categoryIdOrAlias?: string): CategoryDefinition {
  if (!categoryIdOrAlias) return GENERIC_CATEGORY;
  const lower = categoryIdOrAlias.toLowerCase().trim();

  for (const cat of ALL_CATEGORIES) {
    if (cat.id.toLowerCase() === lower || cat.label.toLowerCase() === lower) {
      return cat;
    }
    if (cat.aliases.some((alias) => alias.toLowerCase() === lower)) {
      return cat;
    }
  }

  return GENERIC_CATEGORY;
}

export function detectCategoryFromText(text: string): CategoryDefinition {
  const lower = text.toLowerCase();

  // Priority order: check specific compound categories first
  const orderedCategories = [
    KEYBOARD_CATEGORY,
    APPLIANCES_CATEGORY,
    FOOTWEAR_CATEGORY,
    FURNITURE_CATEGORY,
    HEADPHONES_CATEGORY,
    SMARTPHONES_CATEGORY,
    MONITORS_CATEGORY,
    LAPTOP_CATEGORY,
  ];

  for (const cat of orderedCategories) {
    for (const alias of cat.aliases) {
      // Regex word boundary match
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedAlias}\\b`, "i");
      if (regex.test(lower)) {
        return cat;
      }
    }
  }

  return GENERIC_CATEGORY;
}
