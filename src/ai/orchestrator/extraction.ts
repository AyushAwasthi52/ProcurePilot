import { getLlmClient } from "../llm/factory";
import { MockLlmClient } from "../llm/mock-client";
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

  let brief: PurchaseBrief;
  try {
    brief = await client.generateStructured(
      EXTRACTION_SYSTEM_PROMPT,
      wrappedUserPrompt,
      PurchaseBriefSchema
    );
  } catch (err) {
    if (client instanceof MockLlmClient) {
      throw err;
    }
    console.warn(
      `[AI Orchestrator] Primary AI provider (${client.constructor.name}) unavailable or failed: ${
        err instanceof Error ? err.message : String(err)
      }. Falling back to deterministic offline extraction engine.`
    );
    const fallbackClient = new MockLlmClient();
    brief = await fallbackClient.generateStructured(
      EXTRACTION_SYSTEM_PROMPT,
      wrappedUserPrompt,
      PurchaseBriefSchema
    );
  }

  if (overrides?.region) {
    brief.region = overrides.region;
  }
  if (overrides?.currency) {
    const oldCurrency = brief.budget.currency;
    brief.budget.currency = overrides.currency;
    const isProvisional = brief.assumptions.some(
      (a) => a.field === "budget" && a.origin === "default"
    );
    if (isProvisional && oldCurrency !== overrides.currency) {
      if (overrides.currency === "INR") {
        const inrBaselines: Record<string, number> = {
          Laptop: 6000000,
          Headphones: 500000,
          Smartphone: 2500000,
          Monitor: 1500000,
          Keyboard: 400000,
          Furniture: 1200000,
          Footwear: 500000,
          "Home Appliances": 1000000,
          General: 800000,
        };
        brief.budget.amountMinor = inrBaselines[brief.category] ?? 800000;
        const budgetConstraint = brief.mustHave.find((m) => m.attribute === "budget");
        if (budgetConstraint) {
          budgetConstraint.value = brief.budget.amountMinor;
        }
      }
    }
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

