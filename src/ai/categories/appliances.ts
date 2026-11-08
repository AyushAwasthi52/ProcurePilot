import { CategoryDefinition } from "./types";

export const APPLIANCES_CATEGORY: CategoryDefinition = {
  id: "Home Appliances",
  label: "Appliances & Air Quality",
  aliases: ["air purifier", "purifier", "vacuum", "dehumidifier", "humidifier", "air cleaner", "appliance"],
  attributes: [
    { name: "coverageAreaSqFt", label: "Room Coverage (sq ft)", type: "number", unit: "sq ft" },
    { name: "hepaFilter", label: "True HEPA Filtration (H13)", type: "boolean" },
    { name: "noiseLevelDb", label: "Noise Level (dB)", type: "number", unit: "dB" },
    { name: "smartControls", label: "WiFi / App Control", type: "boolean" },
  ],
  defaultPreferences: [
    { attribute: "airCleaningPerformance", label: "Filtration CADR & Area Coverage", weight: 40 },
    { attribute: "noiseLevel", label: "Quiet Sleep Operation", weight: 25 },
    { attribute: "energyEfficiency", label: "Power & Filter Replacement Cost", weight: 20 },
    { attribute: "valueForMoney", label: "Value for money", weight: 15 },
  ],
  clarificationQuestions: {
    roomSize: {
      id: "clarify_purifier_room_size",
      attribute: "coverageAreaSqFt",
      question: "What is the approximate size of the room you need to purify?",
      context: "Proper coverage ensures sufficient Air Changes per Hour (ACH) for clean air.",
      options: [
        { id: "opt_room_small", label: "Small room (up to 200 sq ft)", value: 200 },
        { id: "opt_room_medium", label: "Medium room (200 - 400 sq ft)", value: 350 },
        { id: "opt_room_large", label: "Large room or open space (400+ sq ft)", value: 500 },
      ],
    },
  },
};

