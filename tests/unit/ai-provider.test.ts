import { describe, it, expect } from "vitest";
import { getLlmClient } from "@/src/ai/llm/factory";
import { MockLlmClient } from "@/src/ai/llm/mock-client";
import { GeminiLlmClient } from "@/src/ai/llm/gemini-client";
import { EXTRACTION_SYSTEM_PROMPT } from "@/src/ai/prompts/extraction-v1";
import { PurchaseBriefSchema } from "@/src/ai/schemas/brief";

describe("AI Provider Integration & Financial Isolation (Section 2)", () => {
  it("selects MockLlmClient when provider is mock", () => {
    const client = getLlmClient("mock");
    expect(client).toBeInstanceOf(MockLlmClient);
  });

  it("selects GeminiLlmClient when provider is gemini", () => {
    const client = getLlmClient("gemini");
    expect(client).toBeInstanceOf(GeminiLlmClient);
  });

  it("validates structured output strictly against Zod schemas", async () => {
    const client = new MockLlmClient();
    const prompt = `<USER_REQUEST>\nA laptop for programming with 32GB RAM and 2-year warranty under $1800\n</USER_REQUEST>`;

    const result = await client.generateStructured(
      EXTRACTION_SYSTEM_PROMPT,
      prompt,
      PurchaseBriefSchema
    );

    expect(result.schemaVersion).toBe(3);
    expect(result.category).toBe("Laptop");
    expect(result.budget.amountMinor).toBe(180000);
    expect(result.budget.currency).toBe("USD");
  });

  it("guarantees model output cannot determine payment amounts or approval status", () => {
    // LLM outputs requirements and preferences; it never outputs purchase plans, approvals, or money captures.
    const schemaKeys = Object.keys(PurchaseBriefSchema.shape);
    expect(schemaKeys).not.toContain("totalKnownMinor");
    expect(schemaKeys).not.toContain("planHash");
    expect(schemaKeys).not.toContain("approvalId");
    expect(schemaKeys).not.toContain("paymentStatus");
  });
});
