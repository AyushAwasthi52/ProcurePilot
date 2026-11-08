import { PurchaseBrief } from "../schemas/brief";
import {
  ClarificationQuestion,
  ClarificationAnswer,
} from "../schemas/clarification";
import { getCategoryDefinition, GENERIC_CATEGORY } from "../categories";

export function evaluateClarificationPolicy(
  brief: PurchaseBrief
): ClarificationQuestion | null {
  // Check if any must-have requires user confirmation
  const unconfirmedMustHave = brief.mustHave.find(
    (mh) => mh.confirmed === false || mh.provenance === "confirm"
  );

  if (!unconfirmedMustHave) {
    return null;
  }

  // 1. Explicit Category ambiguity
  if (unconfirmedMustHave.attribute === "category" && GENERIC_CATEGORY.clarificationQuestions.category) {
    return GENERIC_CATEGORY.clarificationQuestions.category;
  }

  // 2. Budget clarification
  if (unconfirmedMustHave.attribute === "budget") {
    const curr = brief.budget.currency;
    const defaultMinor = curr === "INR" ? 800000 : curr === "JPY" ? 20000 : 15000;
    const base = (brief.budget.amountMinor && brief.budget.amountMinor > 0) ? brief.budget.amountMinor : defaultMinor;
    const isMinor = curr !== "JPY";
    const factor = isMinor ? 100 : 1;
    const fmt = (minor: number) => {
      const val = Math.round(minor / factor);
      if (curr === "INR") return `₹${val.toLocaleString("en-IN")}`;
      if (curr === "USD") return `$${val.toLocaleString("en-US")}`;
      if (curr === "EUR") return `€${val.toLocaleString("en-US")}`;
      if (curr === "GBP") return `£${val.toLocaleString("en-GB")}`;
      return `${curr} ${val.toLocaleString()}`;
    };

    const tier1 = Math.round(base * 0.6);
    const tier2 = base;
    const tier3 = Math.round(base * 1.8);

    return {
      id: "clarify_budget",
      attribute: "budget",
      question: `What is your target budget for this ${brief.category}?`,
      context: `No budget was specified in your prompt. A provisional baseline of ${fmt(base)} is set. Select a target tier or keep it flexible.`,
      options: [
        { id: `opt_budget_${tier1}`, label: `Economy / Entry-level (up to ${fmt(tier1)})`, value: tier1 },
        { id: `opt_budget_${tier2}`, label: `Mid-range / Balanced (up to ${fmt(tier2)})`, value: tier2 },
        { id: `opt_budget_${tier3}`, label: `Premium / High-end (up to ${fmt(tier3)})`, value: tier3 },
        { id: "opt_budget_flexible", label: "Flexible / No strict budget limit", value: "flexible" },
      ],
    };
  }

  const categoryDef = getCategoryDefinition(brief.category);
  const question = categoryDef.clarificationQuestions[unconfirmedMustHave.attribute];

  if (question) {
    return question;
  }

  // Fallback dynamic question if attribute has no static definition
  return {
    id: `clarify_${unconfirmedMustHave.attribute}`,
    attribute: unconfirmedMustHave.attribute,
    question: `Confirm requirement: is ${unconfirmedMustHave.label || unconfirmedMustHave.attribute} required for your purchase?`,
    context: `This constraint was inferred from your request with partial confidence.`,
    options: [
      {
        id: `opt_${unconfirmedMustHave.attribute}_yes`,
        label: `Yes, ${unconfirmedMustHave.label || unconfirmedMustHave.attribute} required`,
        value: Array.isArray(unconfirmedMustHave.value)
          ? unconfirmedMustHave.value.join(",")
          : unconfirmedMustHave.value,
      },
      {
        id: `opt_${unconfirmedMustHave.attribute}_no`,
        label: `No, not required`,
        value: false,
      },
      {
        id: `opt_${unconfirmedMustHave.attribute}_either`,
        label: "Flexible / either is fine",
        value: "either",
      },
    ],
  };
}

export function applyClarificationAnswer(
  brief: PurchaseBrief,
  answer: ClarificationAnswer
): PurchaseBrief {
  const updated = structuredClone(brief);

  // 0. Category Clarification
  if (answer.questionId === "clarify_category") {
    const categoryMap: Record<string, string> = {
      opt_cat_laptop: "Laptop",
      opt_cat_headphones: "Headphones",
      opt_cat_smartphone: "Smartphone",
      opt_cat_monitor: "Monitor",
      opt_cat_general: "General",
    };
    const chosenCategory = categoryMap[answer.selectedOptionId] || "General";
    updated.category = chosenCategory;
    const newCatDef = getCategoryDefinition(chosenCategory);
    updated.preferences = newCatDef.defaultPreferences.map((p) => ({ ...p }));
    updated.mustHave = updated.mustHave.filter((m) => m.attribute !== "category");
    return updated;
  }

  // 0b. Budget Clarification
  if (answer.questionId === "clarify_budget") {
    const budgetIndex = updated.mustHave.findIndex((mh) => mh.attribute === "budget");
    if (answer.selectedOptionId === "opt_budget_flexible") {
      if (budgetIndex >= 0) {
        updated.mustHave.splice(budgetIndex, 1);
      }
      updated.budget.amountMinor = null;
      updated.budget.isKnown = false;
    } else {
      const parts = answer.selectedOptionId.split("_");
      const minorVal = Number(parts[parts.length - 1]);
      if (!isNaN(minorVal) && minorVal > 0) {
        updated.budget.amountMinor = minorVal;
        updated.budget.isKnown = true;
        if (budgetIndex >= 0) {
          updated.mustHave[budgetIndex].confirmed = true;
          updated.mustHave[budgetIndex].value = minorVal;
          updated.mustHave[budgetIndex].provenance = "you-said";
        }
      } else if (budgetIndex >= 0) {
        updated.mustHave[budgetIndex].confirmed = true;
        updated.mustHave[budgetIndex].provenance = "you-said";
      }
    }
    return updated;
  }

  // 1. Laptop CUDA
  if (answer.questionId === "clarify_cuda_ml") {
    const cudaIndex = updated.mustHave.findIndex(
      (mh) => mh.attribute === "cudaSupport"
    );

    if (answer.selectedOptionId === "opt_cuda_yes") {
      if (cudaIndex >= 0) {
        updated.mustHave[cudaIndex].confirmed = true;
        updated.mustHave[cudaIndex].value = true;
        updated.mustHave[cudaIndex].provenance = "you-said";
      } else {
        updated.mustHave.push({
          attribute: "cudaSupport",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "Dedicated NVIDIA GPU (CUDA)",
        });
      }
    } else if (answer.selectedOptionId === "opt_cuda_no") {
      if (cudaIndex >= 0) {
        updated.mustHave.splice(cudaIndex, 1);
      }
    } else if (answer.selectedOptionId === "opt_cuda_either") {
      if (cudaIndex >= 0) {
        updated.mustHave.splice(cudaIndex, 1);
      }
      const existingPref = updated.preferences.find(
        (p) => p.attribute === "gpuPerformance"
      );
      if (existingPref) {
        existingPref.weight = 20;
      }
    }
    return updated;
  }

  // 2. Headphones ANC
  if (answer.questionId === "clarify_headphones_anc") {
    const ancIndex = updated.mustHave.findIndex(
      (mh) => mh.attribute === "anc"
    );

    if (answer.selectedOptionId === "opt_anc_yes") {
      if (ancIndex >= 0) {
        updated.mustHave[ancIndex].confirmed = true;
        updated.mustHave[ancIndex].value = true;
        updated.mustHave[ancIndex].provenance = "you-said";
      } else {
        updated.mustHave.push({
          attribute: "anc",
          operator: "eq",
          value: true,
          confirmed: true,
          provenance: "you-said",
          label: "Active Noise Cancellation (ANC)",
        });
      }
    } else if (answer.selectedOptionId === "opt_anc_no") {
      if (ancIndex >= 0) {
        updated.mustHave.splice(ancIndex, 1);
      }
    } else if (answer.selectedOptionId === "opt_anc_either") {
      if (ancIndex >= 0) {
        updated.mustHave.splice(ancIndex, 1);
      }
      const existingPref = updated.preferences.find(
        (p) => p.attribute === "noiseCancellation"
      );
      if (existingPref) {
        existingPref.weight = 25;
      }
    }
    return updated;
  }

  // 3. Smartphone OS
  if (answer.questionId === "clarify_smartphone_os") {
    const osIndex = updated.mustHave.findIndex(
      (mh) => mh.attribute === "os"
    );

    if (answer.selectedOptionId === "opt_os_ios" || answer.selectedOptionId === "opt_os_android") {
      const chosenOs = answer.selectedOptionId === "opt_os_ios" ? "iOS" : "Android";
      if (osIndex >= 0) {
        updated.mustHave[osIndex].confirmed = true;
        updated.mustHave[osIndex].value = chosenOs;
        updated.mustHave[osIndex].provenance = "you-said";
        updated.mustHave[osIndex].label = `Operating System (${chosenOs})`;
      } else {
        updated.mustHave.push({
          attribute: "os",
          operator: "eq",
          value: chosenOs,
          confirmed: true,
          provenance: "you-said",
          label: `Operating System (${chosenOs})`,
        });
      }
    } else {
      // either
      if (osIndex >= 0) {
        updated.mustHave.splice(osIndex, 1);
      }
    }
    return updated;
  }

  // 4. Monitor Refresh Rate
  if (answer.questionId === "clarify_monitor_refresh") {
    const refreshIndex = updated.mustHave.findIndex(
      (mh) => mh.attribute === "refreshRateHz"
    );

    if (answer.selectedOptionId === "opt_refresh_high") {
      if (refreshIndex >= 0) {
        updated.mustHave[refreshIndex].confirmed = true;
        updated.mustHave[refreshIndex].value = 120;
        updated.mustHave[refreshIndex].operator = "gte";
        updated.mustHave[refreshIndex].provenance = "you-said";
        updated.mustHave[refreshIndex].label = "Refresh Rate ≥ 120Hz";
      } else {
        updated.mustHave.push({
          attribute: "refreshRateHz",
          operator: "gte",
          value: 120,
          confirmed: true,
          provenance: "you-said",
          label: "Refresh Rate ≥ 120Hz",
        });
      }
    } else {
      if (refreshIndex >= 0) {
        updated.mustHave.splice(refreshIndex, 1);
      }
    }
    return updated;
  }

  // Generic fallback: match by unconfirmed attribute
  const unconfirmedIndex = updated.mustHave.findIndex(
    (mh) => mh.confirmed === false || mh.provenance === "confirm"
  );
  if (unconfirmedIndex >= 0) {
    if (answer.selectedOptionId.endsWith("_yes")) {
      updated.mustHave[unconfirmedIndex].confirmed = true;
      updated.mustHave[unconfirmedIndex].provenance = "you-said";
    } else {
      updated.mustHave.splice(unconfirmedIndex, 1);
    }
  }

  return updated;
}
