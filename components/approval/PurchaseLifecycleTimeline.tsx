import React from "react";

export interface StepItem {
  number: number;
  label: string;
}

const LIFECYCLE_STEPS: StepItem[] = [
  { number: 1, label: "Draft" },
  { number: 2, label: "Reviewed" },
  { number: 3, label: "Approved" },
  { number: 4, label: "Order created" },
  { number: 5, label: "Payer action" },
  { number: 6, label: "Capture" },
  { number: 7, label: "Completed" },
];

export interface PurchaseLifecycleTimelineProps {
  currentStepNumber?: number; // 2 on review, 3 when approved, 4 when order created, etc.
}

export function PurchaseLifecycleTimeline({
  currentStepNumber = 2,
}: PurchaseLifecycleTimelineProps) {
  return (
    <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm">
      <h3 className="font-heading font-bold text-base text-[#16191C] mb-4">
        Where this purchase stands
      </h3>

      {/* Steps Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {LIFECYCLE_STEPS.map((step) => {
          const isCompleted = step.number < currentStepNumber;
          const isCurrent = step.number === currentStepNumber;
          const isActive = isCompleted || isCurrent;

          return (
            <div key={step.number} className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-[#0E5A55] text-white"
                    : "bg-[#E2DDD0] text-[#4D534F]"
                }`}
              >
                {step.number}
              </span>
              <span
                className={`text-xs ${
                  isActive
                    ? "font-semibold text-[#16191C]"
                    : "font-normal text-[#7A7569]"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Explanatory Footnote */}
      <p className="text-xs text-[#4D534F] mt-5 leading-relaxed">
        Paid is shown only after PayPal confirms the capture. Returning from PayPal is never treated as proof of payment.
      </p>
    </div>
  );
}
