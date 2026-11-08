import { z } from "zod";

export interface LlmClient {
  generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodSchema<T>
  ): Promise<T>;
}
