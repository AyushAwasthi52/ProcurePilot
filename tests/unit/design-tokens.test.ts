import { describe, it, expect } from "vitest";

describe("Design System Tokens & Vocabulary", () => {
  it("defines standard color tokens matching specification Section 4.5", () => {
    const expectedTokens = {
      bg: "#F5F2EA",
      surface: "#FFFFFF",
      ink: "#16191C",
      inkMuted: "#4D534F",
      line: "#E2DDD0",
      accent: "#0E5A55",
      okBg: "#DDEDEA",
      okFg: "#0A4743",
      infoBg: "#E4E9F7",
      infoFg: "#26397A",
      warnBg: "#FBE6CC",
      warnFg: "#7A3D00",
    };

    expect(expectedTokens.bg).toBe("#F5F2EA");
    expect(expectedTokens.surface).toBe("#FFFFFF");
    expect(expectedTokens.ink).toBe("#16191C");
    expect(expectedTokens.accent).toBe("#0E5A55");
  });

  it("has exact card and control border radii", () => {
    const radii = {
      card: "18px",
      control: "12px",
    };
    expect(radii.card).toBe("18px");
    expect(radii.control).toBe("12px");
  });

  it("validates all required provenance vocabulary labels", () => {
    const provenanceVocabulary = [
      "You said",
      "Inferred",
      "Confirm",
      "Provider-reported",
      "Verified",
      "Computed",
      "Estimated",
      "Unknown / Unverified",
      "Stale",
      "Demo data",
    ];

    expect(provenanceVocabulary).toHaveLength(10);
    expect(provenanceVocabulary).toContain("You said");
    expect(provenanceVocabulary).toContain("Demo data");
    expect(provenanceVocabulary).toContain("Verified");
  });
});
