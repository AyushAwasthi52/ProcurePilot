import { describe, it, expect } from "vitest";
import { extractRequirementsFromPrompt } from "@/src/ai/orchestrator/extraction";
import { applyClarificationAnswer } from "@/src/ai/orchestrator/clarification";
import { evaluateConstraint } from "@/src/domain/scoring/constraints";
import { normalizeProviderOffer } from "@/src/domain/catalog/normalizer";

describe("Phase 3: Category & Attribute Handling for General and Unfamiliar Products", () => {
  it("retains specific extracted attributes for unfamiliar / generic products instead of empty brief", async () => {
    const result = await extractRequirementsFromPrompt(
      "Ergonomic mesh office chair with adjustable lumbar support and 3D armrests under $400"
    );

    expect(["General", "Furniture"]).toContain(result.brief.category);
    expect(result.brief.budget.amountMinor).toBe(40000);

    const attrNames = result.brief.mustHave.map((m) => m.attribute);
    expect(attrNames).toContain("lumbarSupport");
    expect(attrNames).toContain("armrests");
    expect(attrNames).toContain("material");
    expect(attrNames).toContain("ergonomics");

    const materialConstraint = result.brief.mustHave.find((m) => m.attribute === "material");
    expect(materialConstraint?.value).toBe("mesh");
  });

  it("asks category clarification when procurement request is ambiguous", async () => {
    const result = await extractRequirementsFromPrompt(
      "Need a high-performance portable device for travel under $800"
    );

    expect(result.clarificationQuestion).not.toBeNull();
    expect(result.clarificationQuestion?.attribute).toBe("category");
    expect(result.clarificationQuestion?.options.some((o) => o.value === "Laptop")).toBe(true);
    expect(result.clarificationQuestion?.options.some((o) => o.value === "Smartphone")).toBe(true);

    // User clarifies it is a Laptop
    const resolvedBrief = applyClarificationAnswer(result.brief, {
      questionId: result.clarificationQuestion!.id,
      selectedOptionId: "opt_cat_laptop",
    });

    expect(resolvedBrief.category).toBe("Laptop");
  });

  it("preserves PASS, FAIL, and UNVERIFIED distinctions for arbitrary attributes", () => {
    const offerWithAttribute = normalizeProviderOffer(
      {
        providerId: "seeded_demo",
        productTitle: "Ergonomic Mesh Chair X",
        brand: "SteelFlex",
        category: "General",
        attributes: {
          lumbarSupport: true,
          material: "mesh",
        },
        merchantId: "mer_test",
        merchantName: "Office Depot",
        price: {
          amountMinor: 35000,
          currency: "USD",
        },
        shipping: {
          status: "KNOWN",
          amountMinor: 0,
        },
        availability: "in_stock",
        productUrl: "https://officedepot.example/chair",
        observedAt: new Date().toISOString(),
        isDemo: true,
      },
      0
    );

    // 1. Passing constraint
    const passRes = evaluateConstraint(
      { attribute: "lumbarSupport", operator: "eq", value: true },
      offerWithAttribute
    );
    expect(passRes.status).toBe("PASS");

    // 2. Failing constraint
    const failRes = evaluateConstraint(
      { attribute: "material", operator: "eq", value: "leather" },
      offerWithAttribute
    );
    expect(failRes.status).toBe("FAIL");

    // 3. Unverified / missing constraint
    const unverifiedRes = evaluateConstraint(
      { attribute: "armrests", operator: "eq", value: true },
      offerWithAttribute
    );
    expect(unverifiedRes.status).toBe("UNVERIFIED");
  });
});
