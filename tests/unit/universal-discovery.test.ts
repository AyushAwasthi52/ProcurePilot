import { describe, it, expect } from "vitest";
import { extractRequirementsFromPrompt } from "@/src/ai/orchestrator/extraction";
import { applyClarificationAnswer } from "@/src/ai/orchestrator/clarification";

describe("Universal Product Discovery & Extraction Engine", () => {
  it("successfully extracts brief for 'keyboard' without crashing or zero budget", async () => {
    const result = await extractRequirementsFromPrompt("keyboard");

    expect(result.brief).toBeDefined();
    expect(result.brief.category).toBe("Keyboard");
    expect(result.brief.query).toBe("keyboard");
    expect(result.brief.budget.amountMinor).toBeGreaterThan(0);
    expect(result.brief.budget.currency).toBe("USD");

    // Missing budget must trigger a clarification question
    expect(result.clarificationQuestion).not.toBeNull();
    expect(result.clarificationQuestion?.attribute).toBe("budget");
    expect(result.clarificationQuestion?.options.length).toBeGreaterThanOrEqual(3);

    // Answering budget clarification updates budget and confirms it
    const answered = applyClarificationAnswer(result.brief, {
      questionId: "clarify_budget",
      selectedOptionId: "opt_budget_18000",
    });
    expect(answered.budget.amountMinor).toBe(18000);
    const budgetConstraint = answered.mustHave.find((m) => m.attribute === "budget");
    expect(budgetConstraint?.confirmed).toBe(true);
  });

  it("extracts 'wireless mechanical keyboard under ₹8,000' with correct INR currency and explicit constraints", async () => {
    const result = await extractRequirementsFromPrompt("wireless mechanical keyboard under ₹8,000");

    expect(result.brief.category).toBe("Keyboard");
    expect(result.brief.query).toBe("wireless mechanical keyboard");
    expect(result.brief.budget.currency).toBe("INR");
    // ₹8,000 * 100 paise = 800,000 minor units
    expect(result.brief.budget.amountMinor).toBe(800000);
    expect(result.brief.region).toBe("IN");

    const attrs = result.brief.mustHave.map((m) => m.attribute);
    expect(attrs).toContain("wireless");
    expect(attrs).toContain("mechanical");

    const wireless = result.brief.mustHave.find((m) => m.attribute === "wireless");
    expect(wireless?.confirmed).toBe(true);
    expect(wireless?.provenance).toBe("you-said");

    // Explicit budget means no budget clarification question is required
    expect(result.clarificationQuestion).toBeNull();
  });

  it("extracts 'ergonomic office chair' with furniture category, attributes, and budget clarification", async () => {
    const result = await extractRequirementsFromPrompt("ergonomic office chair");

    expect(result.brief.category).toBe("Furniture");
    expect(result.brief.query).toBe("ergonomic office chair");
    expect(result.brief.budget.amountMinor).toBeGreaterThan(0);

    const attrs = result.brief.mustHave.map((m) => m.attribute);
    expect(attrs).toContain("ergonomics");

    // Unspecified budget requires clarification
    expect(result.clarificationQuestion).not.toBeNull();
    expect(result.clarificationQuestion?.attribute).toBe("budget");
  });

  it("extracts '4K monitor under ₹40,000' with 4K resolution, INR currency, and no clarification needed", async () => {
    const result = await extractRequirementsFromPrompt("4K monitor under ₹40,000");

    expect(result.brief.category).toBe("Monitor");
    expect(result.brief.query).toBe("4K monitor");
    expect(result.brief.budget.currency).toBe("INR");
    // ₹40,000 * 100 paise = 4,000,000 minor units
    expect(result.brief.budget.amountMinor).toBe(4000000);
    expect(result.brief.region).toBe("IN");

    const resConstraint = result.brief.mustHave.find((m) => m.attribute === "resolution");
    expect(resConstraint).toBeDefined();
    expect(resConstraint?.value).toBe("3840x2160");
    expect(resConstraint?.confirmed).toBe(true);

    expect(result.clarificationQuestion).toBeNull();
  });

  it("extracts 'running shoes for daily training' with Footwear category and athletic use cases", async () => {
    const result = await extractRequirementsFromPrompt("running shoes for daily training");

    expect(result.brief.category).toBe("Footwear");
    expect(result.brief.query).toBe("running shoes for daily training");
    expect(result.brief.useCases).toContain("Daily Training & Fitness");

    const purpose = result.brief.mustHave.find((m) => m.attribute === "purpose");
    expect(purpose?.value).toBe("Daily Training");

    // Budget clarification should be asked
    expect(result.clarificationQuestion).not.toBeNull();
    expect(result.clarificationQuestion?.attribute).toBe("budget");
  });

  it("extracts 'air purifier for a 300 sq ft room' with Home Appliances category and room size constraint", async () => {
    const result = await extractRequirementsFromPrompt("air purifier for a 300 sq ft room");

    expect(result.brief.category).toBe("Home Appliances");
    expect(result.brief.query).toBe("air purifier for a 300 sq ft room");

    const areaConstraint = result.brief.mustHave.find((m) => m.attribute === "coverageAreaSqFt");
    expect(areaConstraint).toBeDefined();
    expect(areaConstraint?.value).toBe(300);
    expect(areaConstraint?.operator).toBe("gte");
    expect(areaConstraint?.confirmed).toBe(true);

    expect(result.clarificationQuestion).not.toBeNull();
    expect(result.clarificationQuestion?.attribute).toBe("budget");
  });

  it("supports unfamiliar products cleanly without rejecting or inventing attributes", async () => {
    const result = await extractRequirementsFromPrompt(
      "astronomical telescope for deep sky astrophotography under $800"
    );

    expect(result.brief).toBeDefined();
    expect(result.brief.query).toContain("astronomical telescope");
    expect(result.brief.budget.amountMinor).toBe(80000);
    expect(result.brief.budget.currency).toBe("USD");
  });

  it("accurately handles currencies and integer minor units across USD, EUR, GBP, INR, JPY", async () => {
    const usd = await extractRequirementsFromPrompt("webcam under $120");
    expect(usd.brief.budget.amountMinor).toBe(12000);
    expect(usd.brief.budget.currency).toBe("USD");

    const eur = await extractRequirementsFromPrompt("webcam under €95");
    expect(eur.brief.budget.amountMinor).toBe(9500);
    expect(eur.brief.budget.currency).toBe("EUR");

    const gbp = await extractRequirementsFromPrompt("webcam under £75");
    expect(gbp.brief.budget.amountMinor).toBe(7500);
    expect(gbp.brief.budget.currency).toBe("GBP");

    const inr = await extractRequirementsFromPrompt("webcam under ₹4,500");
    expect(inr.brief.budget.amountMinor).toBe(450000);
    expect(inr.brief.budget.currency).toBe("INR");

    const jpy = await extractRequirementsFromPrompt("webcam under ¥15,000");
    expect(jpy.brief.budget.amountMinor).toBe(15000);
    expect(jpy.brief.budget.currency).toBe("JPY");

    const cad = await extractRequirementsFromPrompt("webcam under CAD 140");
    expect(cad.brief.budget.amountMinor).toBe(14000);
    expect(cad.brief.budget.currency).toBe("CAD");

    const aud = await extractRequirementsFromPrompt("webcam under 160 AUD");
    expect(aud.brief.budget.amountMinor).toBe(16000);
    expect(aud.brief.budget.currency).toBe("AUD");
  });
});

