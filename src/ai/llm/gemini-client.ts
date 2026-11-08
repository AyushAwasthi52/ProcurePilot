import { z } from "zod";
import { LlmClient } from "./client";

export class GeminiLlmClient implements LlmClient {
  constructor(
    private apiKey: string,
    private model: string = "gemini-1.5-flash",
    private baseUrl: string = "https://generativelanguage.googleapis.com/v1beta"
  ) {}

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error(
        "Gemini API key is required. Please set AI_API_KEY in your environment."
      );
    }

    const endpoint = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Gemini API request failed (${res.status}): ${errorText}`
      );
    }

    const data = await res.json();
    const rawText =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("No text response returned from Gemini API");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new Error(`Failed to parse Gemini response as JSON: ${rawText}`);
    }

    // Strictly validate against Zod schema
    const validationResult = schema.safeParse(parsedJson);
    if (!validationResult.success) {
      throw new Error(
        `Gemini output failed schema validation: ${JSON.stringify(
          validationResult.error.format()
        )}`
      );
    }

    return validationResult.data;
  }
}

