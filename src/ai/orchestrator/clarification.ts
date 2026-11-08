import { PurchaseBrief } from "../schemas/brief";
import {
  ClarificationQuestion,
  ClarificationAnswer,
} from "../schemas/clarification";
import { LAPTOP_CATEGORY } from "../categories/laptops";

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

  if (
    brief.category === "Laptop" &&
    unconfirmedMustHave.attribute === "cudaSupport"
  ) {
    return LAPTOP_CATEGORY.clarificationQuestions.cudaSupport;
  }

  return null;
}

export function applyClarificationAnswer(
  brief: PurchaseBrief,
  answer: ClarificationAnswer
): PurchaseBrief {
  const updated = structuredClone(brief);

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
        // Remove CUDA requirement
        updated.mustHave.splice(cudaIndex, 1);
      }
    } else if (answer.selectedOptionId === "opt_cuda_either") {
      if (cudaIndex >= 0) {
        updated.mustHave.splice(cudaIndex, 1);
      }
      // Add as soft preference weight instead of hard must-have
      const existingPref = updated.preferences.find(
        (p) => p.attribute === "gpuPerformance"
      );
      if (existingPref) {
        existingPref.weight = 20;
      }
    }
  }

  return updated;
}

