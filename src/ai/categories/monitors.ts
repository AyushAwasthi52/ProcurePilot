import { CategoryDefinition } from "./types";

export const MONITORS_CATEGORY: CategoryDefinition = {
  id: "Monitor",
  label: "Monitor",
  aliases: ["monitor", "display", "screen", "oled", "ultrawide"],
  attributes: [
    {
      name: "screenInches",
      label: "Screen Size",
      type: "number",
      unit: "inches",
    },
    {
      name: "resolution",
      label: "Resolution",
      type: "string", // 4K, 1440p, 1080p
    },
    {
      name: "refreshRateHz",
      label: "Refresh Rate",
      type: "number",
      unit: "Hz",
      isExclusionCritical: true,
    },
    {
      name: "panelType",
      label: "Panel Type",
      type: "string", // IPS, OLED, VA
    },
    {
      name: "warrantyMonths",
      label: "Warranty",
      type: "number",
      unit: "months",
    },
  ],

  defaultPreferences: [
    { attribute: "colorAccuracy", label: "Color accuracy", weight: 35 },
    { attribute: "refreshRate", label: "Refresh rate & motion", weight: 30 },
    { attribute: "connectivity", label: "Ports & USB-C hub", weight: 20 },
    { attribute: "ergonomics", label: "Stand ergonomics", weight: 15 },
  ],

  clarificationQuestions: {
    refreshRateHz: {
      id: "clarify_monitor_refresh",
      attribute: "refreshRateHz",
      question:
        "Do you need a high refresh rate (≥ 120Hz) for gaming or fluid scrolling?",
      context:
        "Standard productivity monitors run at 60Hz-75Hz, while gaming and animation monitors run at 120Hz-240Hz.",
      options: [
        {
          id: "opt_refresh_high",
          label: "Yes, 120Hz+ required",
          value: 120,
        },
        {
          id: "opt_refresh_standard",
          label: "Standard 60Hz is fine",
          value: 60,
        },
        {
          id: "opt_refresh_either",
          label: "Either is fine",
          value: "either",
        },
      ],
    },
  },
};
