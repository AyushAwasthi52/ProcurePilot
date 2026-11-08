import { LlmClient } from "./client";
import { MockLlmClient } from "./mock-client";
import { GeminiLlmClient } from "./gemini-client";
import { getEnv } from "@/src/config/env";

export function getLlmClient(providerOverride?: "mock" | "gemini" | "openai"): LlmClient {
  const env = getEnv();
  const provider = providerOverride ?? env.AI_PROVIDER;

  switch (provider) {
    case "gemini":
      return new GeminiLlmClient(env.AI_API_KEY || "", env.AI_MODEL);

    case "openai":
      throw new Error(
        "OpenAI provider adapter is configured in environment but not yet activated. Set AI_PROVIDER=gemini or AI_PROVIDER=mock."
      );

    case "mock":
    default:
      return new MockLlmClient();
  }
}
