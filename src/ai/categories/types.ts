import { ClarificationQuestion } from "../schemas/clarification";
import { PreferenceWeight } from "../schemas/brief";

export interface CategoryAttributeDefinition {
  name: string;
  label: string;
  type: "number" | "string" | "boolean";
  unit?: string;
  isExclusionCritical?: boolean;
}

export interface CategoryDefinition {
  id: string;
  label: string;
  aliases: string[];
  attributes: CategoryAttributeDefinition[];
  defaultPreferences: PreferenceWeight[];
  clarificationQuestions: Record<string, ClarificationQuestion>;
}
