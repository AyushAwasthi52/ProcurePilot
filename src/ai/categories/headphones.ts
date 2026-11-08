import { CategoryDefinition } from "./types";

export const HEADPHONES_CATEGORY: CategoryDefinition = {
  id: "Headphones",
  label: "Headphones",
  aliases: ["headphones", "headphone", "earphones", "earbuds", "earbud", "audio", "headset", "airpods"],
  attributes: [
    {
      name: "anc",
      label: "Active Noise Cancellation",
      type: "boolean",
      isExclusionCritical: true,
    },
    {
      name: "batteryHours",
      label: "Battery Life",
      type: "number",
      unit: "hours",
    },
    {
      name: "formFactor",
      label: "Form Factor",
      type: "string", // over-ear, in-ear, on-ear
    },
    {
      name: "wireless",
      label: "Wireless",
      type: "boolean",
    },
    {
      name: "multipointBluetooth",
      label: "Multipoint Bluetooth",
      type: "boolean",
    },
    {
      name: "warrantyMonths",
      label: "Warranty",
      type: "number",
      unit: "months",
    },
  ],

  defaultPreferences: [
    { attribute: "noiseCancellation", label: "Noise cancellation", weight: 35 },
    { attribute: "soundQuality", label: "Sound quality", weight: 30 },
    { attribute: "comfort", label: "Comfort & fit", weight: 20 },
    { attribute: "batteryLife", label: "Battery life", weight: 15 },
  ],

  clarificationQuestions: {
    anc: {
      id: "clarify_headphones_anc",
      attribute: "anc",
      question:
        "Do you require Active Noise Cancellation (ANC)? This filters out standard passive headphones.",
      context:
        "ANC actively neutralizes ambient background noise (e.g. travel, office noise) using microphones and inverted audio waves.",
      options: [
        {
          id: "opt_anc_yes",
          label: "Yes, ANC required",
          value: true,
        },
        {
          id: "opt_anc_no",
          label: "No, standard isolation is fine",
          value: false,
        },
        {
          id: "opt_anc_either",
          label: "Either is fine",
          value: "either",
        },
      ],
    },
  },
};
