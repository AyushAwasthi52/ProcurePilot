import { z } from "zod";
import { LlmClient } from "./client";
import { PurchaseBrief, MustHaveConstraint } from "../schemas/brief";
import { detectCategoryFromText } from "../categories";

export class MockLlmClient implements LlmClient {
  async generateStructured<T>(
    _systemPrompt: string,
    userPrompt: string,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    const prompt = userPrompt.toLowerCase();

    // 1. Detect category dynamically
    const categoryDef = detectCategoryFromText(userPrompt);
    const category = categoryDef.id;

    // 2. Budget extraction (e.g. $1,800, $350, 1500, under 500)
    let budgetMinor = 180000;
    const dollarMatch = userPrompt.match(/\$([0-9,]+(\.[0-9]{2})?)/);
    if (dollarMatch) {
      const rawNum = parseFloat(dollarMatch[1].replace(/,/g, ""));
      if (!isNaN(rawNum) && rawNum > 0) {
        budgetMinor = Math.round(rawNum * 100);
      }
    } else {
      const underMatch = userPrompt.match(/(?:under|max|budget\s*(?:of|is|:)?)\s*([0-9]+)/i);
      if (underMatch) {
        budgetMinor = parseInt(underMatch[1], 10) * 100;
      } else if (category === "Headphones") {
        budgetMinor = 35000;
      } else if (category === "Smartphone") {
        budgetMinor = 100000;
      } else if (category === "Monitor") {
        budgetMinor = 50000;
      }
    }

    // 3. Currency & shipping
    let currency = "USD";
    if (userPrompt.includes("EUR") || userPrompt.includes("€")) {
      currency = "EUR";
    } else if (userPrompt.includes("GBP") || userPrompt.includes("£")) {
      currency = "GBP";
    }
    const includesShipping = !prompt.includes("excluding shipping");

    // 4. Warranty extraction
    let warrantyMonths: number | null = null;
    const warrantyMatch = prompt.match(/([0-9]+)[\s-]*(?:year|yr)[\s-]*warranty/);
    if (warrantyMatch) {
      warrantyMonths = parseInt(warrantyMatch[1], 10) * 12;
    } else if (prompt.includes("2-year warranty") || prompt.includes("2 year warranty")) {
      warrantyMonths = 24;
    } else if (category === "Laptop" && prompt.includes("warranty")) {
      warrantyMonths = 24;
    }

    const mustHave: MustHaveConstraint[] = [];

    if (warrantyMonths !== null) {
      mustHave.push({
        attribute: "warrantyMonths",
        operator: "gte",
        value: warrantyMonths,
        confirmed: true,
        provenance: "you-said",
        label: `Warranty ≥ ${warrantyMonths} months`,
      });
    }

    // 5. Category-specific constraints and clarifications
    if (category === "Laptop") {
      if (prompt.includes("upgradeable ram") || prompt.includes("ram upgradeable")) {
        mustHave.push({
          attribute: "ramUpgradeable",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "RAM upgradeable",
        });
      }

      const isMlWorkload =
        prompt.includes("ml") ||
        prompt.includes("machine learning") ||
        prompt.includes("deep learning") ||
        prompt.includes("ai");

      if (isMlWorkload) {
        const explicitCuda = prompt.includes("cuda") || prompt.includes("nvidia");
        mustHave.push({
          attribute: "cudaSupport",
          operator: "eq",
          value: true,
          confirmed: explicitCuda,
          provenance: explicitCuda ? "you-said" : "confirm",
          label: "Dedicated NVIDIA GPU (CUDA)",
        });
      }
    } else if (category === "Headphones") {
      const explicitAnc = prompt.includes("anc") || prompt.includes("noise cancel") || prompt.includes("noise-cancel");
      const needsAncClarification = prompt.includes("office") || prompt.includes("travel") || prompt.includes("commute");

      if (explicitAnc) {
        mustHave.push({
          attribute: "anc",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "Active Noise Cancellation (ANC)",
        });
      } else if (needsAncClarification || !prompt.includes("passive")) {
        mustHave.push({
          attribute: "anc",
          operator: "eq",
          value: true,
          confirmed: false,
          provenance: "confirm",
          label: "Active Noise Cancellation (ANC)",
        });
      }

      if (prompt.includes("wireless") || prompt.includes("bluetooth")) {
        mustHave.push({
          attribute: "wireless",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "Wireless (Bluetooth)",
        });
      }
    } else if (category === "Smartphone") {
      const isIos = prompt.includes("ios") || prompt.includes("iphone") || prompt.includes("apple");
      const isAndroid = prompt.includes("android") || prompt.includes("pixel") || prompt.includes("samsung") || prompt.includes("galaxy");

      if (isIos) {
        mustHave.push({
          attribute: "os",
          operator: "eq",
          value: "iOS",
          confirmed: true,
          provenance: "you-said",
          label: "Operating System (Apple iOS)",
        });
      } else if (isAndroid) {
        mustHave.push({
          attribute: "os",
          operator: "eq",
          value: "Android",
          confirmed: true,
          provenance: "you-said",
          label: "Operating System (Google Android)",
        });
      } else {
        mustHave.push({
          attribute: "os",
          operator: "eq",
          value: "iOS",
          confirmed: false,
          provenance: "confirm",
          label: "Operating System (iOS vs Android)",
        });
      }
    } else if (category === "Monitor") {
      const explicitHighRefresh = prompt.includes("120hz") || prompt.includes("144hz") || prompt.includes("240hz");
      const isGaming = prompt.includes("gaming") || prompt.includes("game");

      if (explicitHighRefresh) {
        mustHave.push({
          attribute: "refreshRateHz",
          operator: "gte",
          value: 120,
          confirmed: true,
          provenance: "you-said",
          label: "Refresh Rate ≥ 120Hz",
        });
      } else if (isGaming) {
        mustHave.push({
          attribute: "refreshRateHz",
          operator: "gte",
          value: 120,
          confirmed: false,
          provenance: "confirm",
          label: "Refresh Rate ≥ 120Hz",
        });
      }
    } else {
      // General / unfamiliar procurement items: extract concrete attributes
      if (prompt.includes("lumbar")) {
        mustHave.push({
          attribute: "lumbarSupport",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "Adjustable Lumbar Support",
        });
      }
      if (prompt.includes("armrest")) {
        mustHave.push({
          attribute: "armrests",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "Adjustable Armrests",
        });
      }
      if (prompt.includes("mesh")) {
        mustHave.push({
          attribute: "material",
          operator: "eq",
          value: "mesh",
          confirmed: true,
          provenance: "you-said",
          label: "Mesh Material",
        });
      }
      if (prompt.includes("dual motor")) {
        mustHave.push({
          attribute: "dualMotor",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "Dual Motor",
        });
      }
      if (prompt.includes("usb-c") || prompt.includes("type-c")) {
        mustHave.push({
          attribute: "connectivity",
          operator: "eq",
          value: "USB-C",
          confirmed: true,
          provenance: "you-said",
          label: "USB-C Connectivity",
        });
      }
      if (prompt.includes("wireless") || prompt.includes("bluetooth")) {
        mustHave.push({
          attribute: "wireless",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "Wireless Connectivity",
        });
      }
      if (prompt.includes("ergonomic")) {
        mustHave.push({
          attribute: "ergonomics",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "Ergonomic Design",
        });
      }
    }

    // 6. Use cases extraction
    const useCases: string[] = [];
    if (prompt.includes("programming") || prompt.includes("coding")) {
      useCases.push("Programming");
    }
    if (prompt.includes("ml") || prompt.includes("machine learning") || prompt.includes("ai")) {
      useCases.push("ML experiments");
    }
    if (prompt.includes("gaming") || prompt.includes("game")) {
      useCases.push("Gaming");
    }
    if (prompt.includes("travel") || prompt.includes("commute")) {
      useCases.push("Travel & Commute");
    }
    if (prompt.includes("office") || prompt.includes("work")) {
      useCases.push("Office focus");
    }
    if (prompt.includes("photography") || prompt.includes("camera")) {
      useCases.push("Photography");
    }
    if (useCases.length === 0) {
      useCases.push("General daily productivity");
    }

    // 7. Preference weights from category definition
    const preferences = categoryDef.defaultPreferences.map((p) => ({ ...p }));

    // 8. Quantity extraction
    let detectedQty = 1;
    const qtyMatch = prompt.match(/\b(?:quantity|qty)\s*[:=]?\s*(\d+)\b/i) || prompt.match(/\b(\d+)\s*x\b/i);
    if (qtyMatch) {
      detectedQty = parseInt(qtyMatch[1], 10);
    }

    // 9. Region extraction
    let detectedRegion = "US";
    if (/\b(?:in\s+)?(uk|gb)\b/i.test(prompt) || currency === "GBP") {
      detectedRegion = "UK";
    } else if (/\b(?:in\s+)?(eu|europe|germany|france)\b/i.test(prompt) || currency === "EUR") {
      detectedRegion = "EU";
    } else if (/\b(?:in\s+)?(ca|canada)\b/i.test(prompt) || currency === "CAD") {
      detectedRegion = "CA";
    }

    const isAmbiguousCategory =
      category === "General" &&
      (prompt.includes("portable device") ||
        prompt.includes("gear") ||
        prompt.includes("equipment for work") ||
        prompt.includes("setup under"));

    if (isAmbiguousCategory) {
      mustHave.push({
        attribute: "category",
        operator: "eq",
        value: "General",
        confirmed: false,
        provenance: "confirm",
        label: "Product Category",
      });
    }

    const result: PurchaseBrief = {
      category,
      query: `${category} for ${useCases.join(" and ")}`,
      useCases,
      budget: {
        amountMinor: budgetMinor,
        currency,
        includesShipping,
      },
      mustHave,
      preferences,
      region: detectedRegion,
      quantity: detectedQty,
      urgency: prompt.includes("urgent") ? "urgent" : "normal",
      assumptions: [
        {
          field: "category",
          value: category,
          origin: "inferred",
        },
      ],
      schemaVersion: 3,
    };

    return schema.parse(result);
  }
}
