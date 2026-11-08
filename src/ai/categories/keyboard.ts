import { CategoryDefinition } from "./types";

export const KEYBOARD_CATEGORY: CategoryDefinition = {
  id: "Keyboard",
  label: "Keyboards & Input Devices",
  aliases: ["keyboard", "keyboards", "mechanical keyboard", "keychron", "typing keyboard", "keypad"],
  attributes: [
    { name: "wireless", label: "Wireless Connectivity", type: "boolean" },
    { name: "mechanical", label: "Mechanical Switches", type: "boolean" },
    { name: "switchType", label: "Switch Type (Linear/Tactile/Clicky)", type: "string" },
    { name: "backlit", label: "RGB / Backlighting", type: "boolean" },
    { name: "layout", label: "Form Factor (Full / TKL / 75% / 65%)", type: "string" },
    { name: "connectivity", label: "Connectivity (Bluetooth, 2.4GHz, USB-C)", type: "string" },
  ],
  defaultPreferences: [
    { attribute: "typingComfort", label: "Typing feel & ergonomics", weight: 35 },
    { attribute: "buildQuality", label: "Build quality & materials", weight: 25 },
    { attribute: "connectivity", label: "Wireless / Multi-device support", weight: 20 },
    { attribute: "valueForMoney", label: "Value for money", weight: 20 },
  ],
  clarificationQuestions: {
    wireless: {
      id: "clarify_keyboard_wireless",
      attribute: "wireless",
      question: "Do you prefer a wireless or wired keyboard?",
      context: "Wireless keyboards offer desk mobility, while wired keyboards ensure zero latency.",
      options: [
        { id: "opt_kb_wireless_yes", label: "Wireless (Bluetooth / 2.4GHz)", value: true },
        { id: "opt_kb_wireless_no", label: "Wired (USB)", value: false },
        { id: "opt_kb_wireless_either", label: "Either / Flexible", value: "either" },
      ],
    },
    mechanical: {
      id: "clarify_keyboard_mechanical",
      attribute: "mechanical",
      question: "Do you require mechanical switches?",
      context: "Mechanical keyboards provide tactile feedback and durability; membrane keyboards are quieter and lower profile.",
      options: [
        { id: "opt_kb_mech_yes", label: "Mechanical switches", value: true },
        { id: "opt_kb_mech_no", label: "Membrane / Scissor switches", value: false },
        { id: "opt_kb_mech_either", label: "No preference", value: "either" },
      ],
    },
  },
};

