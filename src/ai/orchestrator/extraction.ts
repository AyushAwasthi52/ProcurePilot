import { getLlmClient } from "../llm/factory";
import { EXTRACTION_SYSTEM_PROMPT } from "../prompts/extraction-v1";
import { PurchaseBriefSchema, PurchaseBrief } from "../schemas/brief";
import { ClarificationQuestion } from "../schemas/clarification";
import { evaluateClarificationPolicy } from "./clarification";

export interface ExtractionResult {
  brief: PurchaseBrief;
  clarificationQuestion: ClarificationQuestion | null;
}

export interface ExtractionOverrides {
  region?: string;
  currency?: string;
  quantity?: number;
  urgency?: "low" | "normal" | "urgent";
}

export async function extractRequirementsFromPrompt(
  rawPrompt: string,
  overrides?: ExtractionOverrides
): Promise<ExtractionResult> {
  const client = getLlmClient();

  // Defensive prompt wrapping against prompt injection (TR-08)
  const wrappedUserPrompt = `<USER_REQUEST>\n${rawPrompt.trim()}\n</USER_REQUEST>`;

  const brief = await client.generateStructured(
    EXTRACTION_SYSTEM_PROMPT,
    wrappedUserPrompt,
    PurchaseBriefSchema
  );

  if (overrides?.region) {
    brief.region = overrides.region;
  }
  if (overrides?.currency) {
    brief.budget.currency = overrides.currency;
  }
  if (overrides?.quantity) {
    brief.quantity = overrides.quantity;
  }
  if (overrides?.urgency) {
    brief.urgency = overrides.urgency;
  }

  const clarificationQuestion = evaluateClarificationPolicy(brief);

  return {
    brief,
    clarificationQuestion,
  };
}

