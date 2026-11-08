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
