import { z } from "zod";
import { LlmClient } from "./client";
import { PurchaseBrief, MustHaveConstraint } from "../schemas/brief";

export class MockLlmClient implements LlmClient {
  async generateStructured<T>(
    _systemPrompt: string,
    userPrompt: string,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    const prompt = userPrompt.toLowerCase();

    // Default category extraction
    let category = "Laptop";
    if (prompt.includes("headphone") || prompt.includes("audio")) {
      category = "Headphones";
    } else if (prompt.includes("monitor") || prompt.includes("display")) {
      category = "Monitor";
    }

    // Budget extraction (e.g. $1,800 or 1800 or 1500)
    let budgetMinor = 180000; // Default $1,800.00
    const budgetMatch = userPrompt.match(/\$([0-9,]+(\.[0-9]{2})?)/);
    if (budgetMatch) {
      const rawNum = parseFloat(budgetMatch[1].replace(/,/g, ""));
      if (!isNaN(rawNum) && rawNum > 0) {
        budgetMinor = Math.round(rawNum * 100);
      }
    } else {
      const plainNumMatch = userPrompt.match(/budget\s*(?:of|is|:)?\s*([0-9]+)/i);
      if (plainNumMatch) {
        budgetMinor = parseInt(plainNumMatch[1], 10) * 100;
      }
    }

    // Currency
    const currency = userPrompt.includes("EUR") ? "EUR" : "USD";
    const includesShipping = !prompt.includes("excluding shipping");

    // Warranty extraction
    let warrantyMonths = 24;
    const warrantyMatch = prompt.match(/([0-9]+)[\s-]*(?:year|yr)[\s-]*warranty/);
    if (warrantyMatch) {
      warrantyMonths = parseInt(warrantyMatch[1], 10) * 12;
    }

    // Must-haves
    const mustHave: MustHaveConstraint[] = [
      {
        attribute: "warrantyMonths",
        operator: "gte" as const,
        value: warrantyMonths,
        confirmed: true,
        provenance: "you-said" as const,
        label: `Warranty ≥ ${warrantyMonths} months`,
      },
    ];

    if (prompt.includes("upgradeable ram") || prompt.includes("ram upgradeable")) {
      mustHave.push({
        attribute: "ramUpgradeable",
        operator: "eq" as const,
        value: true,
        confirmed: true,
        provenance: "you-said" as const,
        label: "RAM upgradeable",
      });
    }

    // Critical constraint detection (Screen 1): ML workloads on laptop need CUDA check
    const isMlWorkload =
      prompt.includes("ml") ||
      prompt.includes("machine learning") ||
      prompt.includes("deep learning") ||
      prompt.includes("ai");

    if (isMlWorkload && category === "Laptop") {
      const explicitCuda = prompt.includes("cuda") || prompt.includes("nvidia");
      mustHave.push({
        attribute: "cudaSupport",
        operator: "eq" as const,
        value: true,
        confirmed: explicitCuda,
        provenance: explicitCuda ? ("you-said" as const) : ("confirm" as const),
        label: "Dedicated NVIDIA GPU (CUDA)",
      });
    }

    // Use cases
    const useCases: string[] = [];
    if (prompt.includes("programming") || prompt.includes("coding")) {
      useCases.push("Programming");
    }
    if (isMlWorkload) {
      useCases.push("ML experiments");
    }
    if (prompt.includes("gaming") || prompt.includes("game")) {
      useCases.push("light gaming");
    }
    if (useCases.length === 0) {
      useCases.push("General productive work");
    }

    // Preference weights matching Screen 1 reference
    const preferences = [
      { attribute: "thermals", label: "Thermals", weight: 30 },
      { attribute: "upgradeability", label: "Upgradeability", weight: 25 },
      { attribute: "gpuPerformance", label: "GPU performance", weight: 25 },
      { attribute: "batteryLife", label: "Battery life", weight: 10 },
    ];

    const result: PurchaseBrief = {
      category,
      query: `Laptop for ${useCases.join(" and ")}`,
      useCases,
      budget: {
        amountMinor: budgetMinor,
        currency,
        includesShipping,
      },
      mustHave,
      preferences,
      region: "US",
      quantity: 1,
      urgency: prompt.includes("urgent") ? "urgent" : "normal",
      assumptions: [
        { field: "category", value: category, origin: "inferred" },
      ],
      schemaVersion: 3,
    };

    return schema.parse(result);
  }
}
