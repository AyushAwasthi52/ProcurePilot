import { LlmClient } from "./client";
import { MockLlmClient } from "./mock-client";

export function getLlmClient(): LlmClient {
  // Provider-neutral factory: returns mock client for fast, deterministic, reproducible runs
  return new MockLlmClient();
}

