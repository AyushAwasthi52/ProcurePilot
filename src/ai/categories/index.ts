import { CategoryDefinition } from "./types";
import { LAPTOP_CATEGORY } from "./laptops";
import { HEADPHONES_CATEGORY } from "./headphones";
import { SMARTPHONES_CATEGORY } from "./smartphones";
import { MONITORS_CATEGORY } from "./monitors";
import { GENERIC_CATEGORY } from "./generic";

export * from "./types";
export * from "./laptops";
export * from "./headphones";
export * from "./smartphones";
export * from "./monitors";
export * from "./generic";

export const ALL_CATEGORIES: CategoryDefinition[] = [
  LAPTOP_CATEGORY,
  HEADPHONES_CATEGORY,
  SMARTPHONES_CATEGORY,
  MONITORS_CATEGORY,
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

  // Explicit priority checks
  for (const cat of [
    HEADPHONES_CATEGORY,
    SMARTPHONES_CATEGORY,
    MONITORS_CATEGORY,
    LAPTOP_CATEGORY,
  ]) {
    for (const alias of cat.aliases) {
      // Regex word boundary match
      const regex = new RegExp(`\\b${alias}\\b`, "i");
      if (regex.test(lower)) {
        return cat;
      }
    }
  }

  return GENERIC_CATEGORY;
}
