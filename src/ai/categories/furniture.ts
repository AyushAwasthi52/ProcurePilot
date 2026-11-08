import { CategoryDefinition } from "./types";

export const FURNITURE_CATEGORY: CategoryDefinition = {
  id: "Furniture",
  label: "Office Furniture & Seating",
  aliases: ["chair", "chairs", "office chair", "desk", "standing desk", "furniture", "ergonomic chair"],
  attributes: [
    { name: "ergonomics", label: "Ergonomic Design", type: "boolean" },
    { name: "lumbarSupport", label: "Adjustable Lumbar Support", type: "boolean" },
    { name: "armrests", label: "Adjustable Armrests (3D/4D)", type: "boolean" },
    { name: "material", label: "Upholstery Material (Mesh / Leather / Fabric)", type: "string" },
    { name: "adjustableHeight", label: "Pneumatic Height Adjustment", type: "boolean" },
  ],
  defaultPreferences: [
    { attribute: "ergonomicSupport", label: "Lumbar & Posture Support", weight: 40 },
    { attribute: "buildDurability", label: "Frame & Mechanism Durability", weight: 25 },
    { attribute: "adjustability", label: "Customizable Fit", weight: 20 },
    { attribute: "valueForMoney", label: "Value for money", weight: 15 },
  ],
  clarificationQuestions: {
    material: {
      id: "clarify_chair_material",
      attribute: "material",
      question: "Which chair upholstery material do you prefer?",
      context: "Breathable mesh keeps cool; leather or cushioned fabric provides plush support.",
      options: [
        { id: "opt_chair_mesh", label: "Breathable Mesh", value: "mesh" },
        { id: "opt_chair_leather", label: "Leather / PU", value: "leather" },
        { id: "opt_chair_fabric", label: "Cushioned Fabric", value: "fabric" },
        { id: "opt_chair_either", label: "No preference", value: "either" },
      ],
    },
  },
};

