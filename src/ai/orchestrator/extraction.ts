import { getLlmClient } from "../llm/factory";
import { EXTRACTION_SYSTEM_PROMPT } from "../prompts/extraction-v1";
import { PurchaseBriefSchema, PurchaseBrief } from "../schemas/brief";
import { ClarificationQuestion } from "../schemas/clarification";
import { evaluateClarificationPolicy } from "./clarification";

export interface ExtractionResult {
  brief: PurchaseBrief;
  clarificationQuestion: ClarificationQuestion | null;
}

export async function extractRequirementsFromPrompt(
  rawPrompt: string
): Promise<ExtractionResult> {
  const client = getLlmClient();

  // Defensive prompt wrapping against prompt injection (TR-08)
  const wrappedUserPrompt = `<USER_REQUEST>\n${rawPrompt.trim()}\n</USER_REQUEST>`;

  const brief = await client.generateStructured(
    EXTRACTION_SYSTEM_PROMPT,
    wrappedUserPrompt,
    PurchaseBriefSchema
  );

  const clarificationQuestion = evaluateClarificationPolicy(brief);

  return {
    brief,
    clarificationQuestion,
  };
}

