import { CategoryDefinition } from "./types";

export const FOOTWEAR_CATEGORY: CategoryDefinition = {
  id: "Footwear",
  label: "Footwear & Athletic Shoes",
  aliases: ["shoes", "running shoes", "sneakers", "boots", "footwear", "training shoes"],
  attributes: [
    { name: "purpose", label: "Intended Use (Daily Training / Racing / Trail)", type: "string" },
    { name: "cushioning", label: "Cushioning Level (Max / Moderate / Minimal)", type: "string" },
    { name: "terrain", label: "Terrain (Road / Trail / Track)", type: "string" },
    { name: "breathability", label: "Breathable Mesh Upper", type: "boolean" },
  ],
  defaultPreferences: [
    { attribute: "comfortAndCushioning", label: "Impact Absorption & Comfort", weight: 40 },
    { attribute: "durability", label: "Outsole & Upper Durability", weight: 25 },
    { attribute: "breathability", label: "Ventilation & Weight", weight: 20 },
    { attribute: "valueForMoney", label: "Value for money", weight: 15 },
  ],
  clarificationQuestions: {
    terrain: {
      id: "clarify_shoes_terrain",
      attribute: "terrain",
      question: "What surface will you primarily use these shoes on?",
      context: "Road shoes offer smooth pavement cushioning; trail shoes feature rugged traction lugs.",
      options: [
        { id: "opt_shoes_road", label: "Road / Pavement / Treadmill", value: "road" },
        { id: "opt_shoes_trail", label: "Trail / Off-road / Dirt", value: "trail" },
        { id: "opt_shoes_all", label: "Mixed / General athletic use", value: "all" },
      ],
    },
  },
};

