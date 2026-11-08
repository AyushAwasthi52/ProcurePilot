import { z } from "zod";
import { LlmClient } from "./client";
import { PurchaseBrief, MustHaveConstraint, Assumption } from "../schemas/brief";
import { detectCategoryFromText } from "../categories";

function extractCleanSearchQuery(userPrompt: string, category: string): string {
  const q = userPrompt
    // remove prompt wrapper if present
    .replace(/<USER_REQUEST>|<\/USER_REQUEST>/gi, "")
    // remove budget phrases: under ₹8,000, under $1,800, max ₹40,000, budget 500, etc.
    .replace(/\b(?:under|max|budget(?:\s*(?:of|is|:))?|cap|up to|around|within)\s*[₹$€£¥]?\s*[\d,]+(?:\.\d+)?(?:\s*(?:dollars|usd|eur|gbp|inr|rs|rupees|bucks))?/gi, "")
    .replace(/[₹$€£¥]\s*[\d,]+(?:\.\d+)?/gi, "")
    .replace(/\b[\d,]+(?:\.\d+)?\s*(?:dollars|usd|eur|gbp|inr|rs|rupees|bucks)\b/gi, "")
    // remove quantity and urgency
    .replace(/\b(?:quantity|qty)\s*[:=]?\s*\d+\b/gi, "")
    .replace(/\b\d+x\b/gi, "")
    .replace(/\burgent\b/gi, "")
    // remove natural language boilerplate
    .replace(/\b(?:i want|i need|looking for|please find|search for|buy|purchase|get me|recommend|suggest)\b/gi, "")
    .replace(/[,;:.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (q.length >= 3) {
    return q;
  }
  return category;
}

function getProvisionalBaselineMinor(category: string, currency: string): number {
  const inrBaselines: Record<string, number> = {
    Laptop: 6000000, // ₹60,000
    Headphones: 500000, // ₹5,000
    Smartphone: 2500000, // ₹25,000
    Monitor: 1500000, // ₹15,000
    Keyboard: 400000, // ₹4,000
    Furniture: 1200000, // ₹12,000
    Footwear: 500000, // ₹5,000
    "Home Appliances": 1000000, // ₹10,000
    General: 800000, // ₹8,000
  };

  const usdBaselines: Record<string, number> = {
    Laptop: 120000, // $1,200
    Headphones: 15000, // $150
    Smartphone: 70000, // $700
    Monitor: 25000, // $250
    Keyboard: 10000, // $100
    Furniture: 30000, // $300
    Footwear: 12000, // $120
    "Home Appliances": 20000, // $200
    General: 10000, // $100
  };

  if (currency === "INR") {
    return inrBaselines[category] ?? 800000;
  }
  return usdBaselines[category] ?? 10000;
}

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

    // 2. Currency detection
    let currency = "USD";
    if (userPrompt.includes("₹") || /\b(?:inr|rs\.?|rupees?)\b/i.test(userPrompt)) {
      currency = "INR";
    } else if (userPrompt.includes("€") || /\b(?:eur|euros?)\b/i.test(userPrompt)) {
      currency = "EUR";
    } else if (userPrompt.includes("£") || /\b(?:gbp|pounds?)\b/i.test(userPrompt)) {
      currency = "GBP";
    } else if (/\b(?:cad|c\$)\b/i.test(userPrompt)) {
      currency = "CAD";
    } else if (/\b(?:aud|a\$)\b/i.test(userPrompt)) {
      currency = "AUD";
    } else if (userPrompt.includes("¥") || /\b(?:jpy|yen)\b/i.test(userPrompt)) {
      currency = "JPY";
    } else if (userPrompt.includes("$") || /\b(?:usd|dollars?|bucks)\b/i.test(userPrompt)) {
      currency = "USD";
    }

    // 3. Budget extraction
    let budgetMinor: number | null = null;
    let isBudgetExplicit = false;

    // A. Currency symbol/code prefix: e.g. ₹8,000, $1,800, €350, Rs 500
    const prefixMatch = userPrompt.match(/(?:[₹$€£¥]|rs\.?|inr|usd|eur|gbp)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (prefixMatch) {
      const raw = parseFloat(prefixMatch[1].replace(/,/g, ""));
      if (!isNaN(raw) && raw > 0) {
        budgetMinor = Math.round(raw * (currency === "JPY" ? 1 : 100));
        isBudgetExplicit = true;
      }
    }

    // B. Keyword prefix: e.g. under 8000, under ₹8,000, max 500, budget of 400
    if (budgetMinor === null) {
      const keywordMatch = userPrompt.match(
        /(?:under|max|budget(?:\s*(?:of|is|:))?|cap|up to|around|within)\s*(?:[₹$€£¥]|rs\.?|inr|usd|eur|gbp)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
      );
      if (keywordMatch) {
        const raw = parseFloat(keywordMatch[1].replace(/,/g, ""));
        if (!isNaN(raw) && raw > 0) {
          budgetMinor = Math.round(raw * (currency === "JPY" ? 1 : 100));
          isBudgetExplicit = true;
        }
      }
    }

    // C. Suffix notation: e.g. 8000 rupees, 500 dollars, 40000 inr
    if (budgetMinor === null) {
      const suffixMatch = userPrompt.match(
        /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:[₹$€£¥]|rs\.?|inr|usd|eur|gbp|dollars?|rupees?|bucks)/i
      );
      if (suffixMatch) {
        const raw = parseFloat(suffixMatch[1].replace(/,/g, ""));
        if (!isNaN(raw) && raw > 0) {
          budgetMinor = Math.round(raw * (currency === "JPY" ? 1 : 100));
          isBudgetExplicit = true;
        }
      }
    }

    // D. If still null, establish provisional market baseline
    if (budgetMinor === null) {
      budgetMinor = getProvisionalBaselineMinor(category, currency);
      isBudgetExplicit = false;
    }

    const includesShipping = !prompt.includes("excluding shipping");

    // 4. Region extraction
    let detectedRegion = "US";
    if (currency === "INR" || /\b(?:in|india)\b/i.test(prompt)) {
      detectedRegion = "IN";
    } else if (currency === "GBP" || /\b(?:in\s+)?(uk|gb|britain)\b/i.test(prompt)) {
      detectedRegion = "UK";
    } else if (currency === "EUR" || /\b(?:in\s+)?(eu|europe|germany|france)\b/i.test(prompt)) {
      detectedRegion = "EU";
    } else if (currency === "CAD" || /\b(?:in\s+)?(ca|canada)\b/i.test(prompt)) {
      detectedRegion = "CA";
    }

    // 5. Quantity extraction
    let detectedQty = 1;
    const qtyMatch = prompt.match(/\b(?:quantity|qty)\s*[:=]?\s*(\d+)\b/i) || prompt.match(/\b(\d+)\s*x\b/i);
    if (qtyMatch) {
      detectedQty = parseInt(qtyMatch[1], 10);
    }

    const mustHave: MustHaveConstraint[] = [];

    // If budget was not explicitly specified by the buyer, flag for confirmation
    if (!isBudgetExplicit) {
      mustHave.push({
        attribute: "budget",
        operator: "lte",
        value: budgetMinor,
        confirmed: false,
        provenance: "confirm",
        label: "Target Budget Cap",
      });
    }

    // 6. Warranty extraction
    let warrantyMonths: number | null = null;
    const warrantyMatch = prompt.match(/([0-9]+)[\s-]*(?:year|yr)[\s-]*warranty/);
    if (warrantyMatch) {
      warrantyMonths = parseInt(warrantyMatch[1], 10) * 12;
    } else if (prompt.includes("2-year warranty") || prompt.includes("2 year warranty")) {
      warrantyMonths = 24;
    } else if (category === "Laptop" && prompt.includes("warranty")) {
      warrantyMonths = 24;
    }

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

    // 7. Category-specific constraints
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

      const isMlWorkload = /\b(?:ml|machine\s*learning|deep\s*learning)\b/i.test(prompt);
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
      if (prompt.includes("4k") || prompt.includes("uhd") || prompt.includes("3840")) {
        mustHave.push({
          attribute: "resolution",
          operator: "eq",
          value: "3840x2160",
          confirmed: true,
          provenance: "you-said",
          label: "4K UHD Resolution",
        });
      }

      const explicitHighRefresh = prompt.includes("120hz") || prompt.includes("144hz") || prompt.includes("240hz");
      const isGaming = /\b(?:game|gaming|games)\b/i.test(prompt);

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
    } else if (category === "Keyboard") {
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
      if (prompt.includes("mechanical") || prompt.includes("tactile") || prompt.includes("clicky") || prompt.includes("linear")) {
        mustHave.push({
          attribute: "mechanical",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "Mechanical Switches",
        });
      }
      if (prompt.includes("rgb") || prompt.includes("backlit") || prompt.includes("backlight")) {
        mustHave.push({
          attribute: "backlit",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "RGB / Backlit Keys",
        });
      }
    } else if (category === "Furniture") {
      if (prompt.includes("ergonomic") || prompt.includes("ergo")) {
        mustHave.push({
          attribute: "ergonomics",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "Ergonomic Design",
        });
      }
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
          label: "Breathable Mesh",
        });
      }
    } else if (category === "Footwear") {
      if (prompt.includes("daily training") || prompt.includes("training") || prompt.includes("daily")) {
        mustHave.push({
          attribute: "purpose",
          operator: "eq",
          value: "Daily Training",
          confirmed: true,
          provenance: "you-said",
          label: "Daily Training Running Shoes",
        });
      }
      if (prompt.includes("trail")) {
        mustHave.push({
          attribute: "terrain",
          operator: "eq",
          value: "trail",
          confirmed: true,
          provenance: "you-said",
          label: "Trail Terrain",
        });
      }
    } else if (category === "Home Appliances") {
      const sqFtMatch = prompt.match(/(\d+)\s*(?:sq\s*ft|square\s*feet|sqft)/i);
      if (sqFtMatch) {
        const area = parseInt(sqFtMatch[1], 10);
        mustHave.push({
          attribute: "coverageAreaSqFt",
          operator: "gte",
          value: area,
          confirmed: true,
          provenance: "you-said",
          label: `Room Coverage ≥ ${area} sq ft`,
        });
      }
      if (prompt.includes("hepa")) {
        mustHave.push({
          attribute: "hepaFilter",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "True HEPA Filter",
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

    // 8. Clean search query generation
    const cleanQuery = extractCleanSearchQuery(userPrompt, category);

    // 9. Use cases extraction
    const useCases: string[] = [];
    if (prompt.includes("programming") || prompt.includes("coding")) {
      useCases.push("Programming");
    }
    if (/\b(?:ml|machine\s*learning|deep\s*learning)\b/i.test(prompt)) {
      useCases.push("ML experiments");
    }
    if (/\b(?:game|gaming|games)\b/i.test(prompt)) {
      useCases.push("Gaming");
    }
    if (prompt.includes("travel") || prompt.includes("commute")) {
      useCases.push("Travel & Commute");
    }
    if (/\b(?:office|desk|work|productivity)\b/i.test(prompt)) {
      useCases.push("Office focus");
    }
    if (/\b(?:run|running|marathon|jogging|training|workout|fitness)\b/i.test(prompt)) {
      useCases.push("Daily Training & Fitness");
    }
    if (prompt.includes("photography") || prompt.includes("camera")) {
      useCases.push("Photography");
    }
    if (useCases.length === 0) {
      useCases.push(`${category} use`);
    }

    // 10. Preference weights from category definition
    const preferences = categoryDef.defaultPreferences.map((p) => ({ ...p }));

    const assumptions: Assumption[] = [
      {
        field: "category",
        value: category,
        origin: "inferred",
      },
    ];

    if (!isBudgetExplicit) {
      assumptions.push({
        field: "budget",
        value: `provisional default (${currency} ${Math.round(budgetMinor / (currency === "JPY" ? 1 : 100))})`,
        origin: "default",
      });
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
      query: cleanQuery,
      useCases,
      budget: {
        amountMinor: budgetMinor,
        currency,
        includesShipping,
        isKnown: isBudgetExplicit,
      },
      mustHave,
      preferences,
      region: detectedRegion,
      quantity: detectedQty,
      urgency: prompt.includes("urgent") ? "urgent" : "normal",
      assumptions,
      schemaVersion: 3,
    };

    return schema.parse(result);
  }
}
