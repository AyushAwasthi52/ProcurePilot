import { ClarificationQuestion } from "../schemas/clarification";
import { PreferenceWeight } from "../schemas/brief";

export interface CategoryAttributeDefinition {
  name: string;
  label: string;
  type: "number" | "string" | "boolean";
  unit?: string;
  isExclusionCritical?: boolean;
}

export const LAPTOP_CATEGORY = {
  id: "Laptop",
  label: "Laptop",
  attributes: [
    {
      name: "ramGb",
      label: "RAM",
      type: "number",
      unit: "GB",
    },
    {
      name: "ramUpgradeable",
      label: "RAM Upgradeable",
      type: "boolean",
    },
    {
      name: "ramSlots",
      label: "RAM Slots",
      type: "number",
    },
    {
      name: "storageGb",
      label: "Storage",
      type: "number",
      unit: "GB",
    },
    {
      name: "cudaSupport",
      label: "Dedicated NVIDIA GPU (CUDA)",
      type: "boolean",
      isExclusionCritical: true,
    },
    {
      name: "warrantyMonths",
      label: "Warranty",
      type: "number",
      unit: "months",
    },
    {
      name: "thermalsScore",
      label: "Thermals",
      type: "number",
    },
    {
      name: "batteryLifeHours",
      label: "Battery Life",
      type: "number",
      unit: "hours",
    },
  ] as CategoryAttributeDefinition[],

  defaultPreferences: [
    { attribute: "thermals", label: "Thermals", weight: 30 },
    { attribute: "upgradeability", label: "Upgradeability", weight: 25 },
    { attribute: "gpuPerformance", label: "GPU performance", weight: 25 },
    { attribute: "batteryLife", label: "Battery life", weight: 10 },
  ] as PreferenceWeight[],

  clarificationQuestions: {
    cudaSupport: {
      id: "clarify_cuda_ml",
      attribute: "cudaSupport",
      question:
        "Do your ML workloads need an NVIDIA GPU (CUDA)? This changes which candidates are valid matches.",
      context:
        "ML and deep learning frameworks often benefit significantly from CUDA acceleration.",
      options: [
        {
          id: "opt_cuda_yes",
          label: "Yes, CUDA required",
          value: true,
        },
        {
          id: "opt_cuda_no",
          label: "No, any GPU",
          value: false,
        },
        {
          id: "opt_cuda_either",
          label: "Not sure, show both",
          value: "either",
        },
      ],
    } as ClarificationQuestion,
  },
};

