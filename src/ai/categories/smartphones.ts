import { CategoryDefinition } from "./types";

export const SMARTPHONES_CATEGORY: CategoryDefinition = {
  id: "Smartphone",
  label: "Smartphone",
  aliases: ["smartphone", "phone", "iphone", "android", "pixel", "galaxy", "mobile"],
  attributes: [
    {
      name: "os",
      label: "Operating System",
      type: "string", // iOS, Android
      isExclusionCritical: true,
    },
    {
      name: "storageGb",
      label: "Internal Storage",
      type: "number",
      unit: "GB",
    },
    {
      name: "screenInches",
      label: "Screen Size",
      type: "number",
      unit: "inches",
    },
    {
      name: "batteryMah",
      label: "Battery Capacity",
      type: "number",
      unit: "mAh",
    },
    {
      name: "cameraScore",
      label: "Camera Score",
      type: "number",
    },
    {
      name: "warrantyMonths",
      label: "Warranty",
      type: "number",
      unit: "months",
    },
  ],

  defaultPreferences: [
    { attribute: "cameraQuality", label: "Camera quality", weight: 35 },
    { attribute: "batteryLife", label: "Battery life", weight: 25 },
    { attribute: "performance", label: "Performance", weight: 25 },
    { attribute: "display", label: "Display quality", weight: 15 },
  ],

  clarificationQuestions: {
    os: {
      id: "clarify_smartphone_os",
      attribute: "os",
      question:
        "Do you have an operating system preference (iOS vs Android)?",
      context:
        "Ecosystem compatibility determines app store access, cloud backups, and device pairing.",
      options: [
        {
          id: "opt_os_ios",
          label: "Apple iOS",
          value: "iOS",
        },
        {
          id: "opt_os_android",
          label: "Google Android",
          value: "Android",
        },
        {
          id: "opt_os_either",
          label: "No preference (show best value)",
          value: "either",
        },
      ],
    },
  },
};
