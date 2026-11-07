import React from "react";

export type StepId = "brief" | "compare" | "approve" | "confirm";

interface Step {
  id: StepId;
  number: number;
  label: string;
  href: string;
}

const STEPS: Step[] = [
  { id: "brief", number: 1, label: "Brief", href: "/" },
  { id: "compare", number: 2, label: "Compare", href: "/compare" },
  { id: "approve", number: 3, label: "Approve", href: "/approve" },
  { id: "confirm", number: 4, label: "Confirm", href: "/confirm" },
];

interface StepNavProps {
  currentStep: StepId;
  className?: string;
}

export function StepNav({ currentStep, className = "" }: StepNavProps) {
  return (
    <nav
      aria-label="Workflow progress"
      className={`flex items-center gap-1 sm:gap-2 ${className}`}
    >
      {STEPS.map((step) => {
        const isActive = step.id === currentStep;
        return (
          <div key={step.id} className="flex items-center">
            {isActive ? (
              <span
                aria-current="step"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#16191C] text-white shadow-sm"
              >
                <span>{step.number}</span>
                <span>{step.label}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#4D534F] hover:text-[#16191C] transition-colors">
                <span className="text-[#888E8B]">{step.number}</span>
                <span>{step.label}</span>
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
