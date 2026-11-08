import React from "react";

export type CheckoutMode = "DEMO_PAYPAL" | "HANDOFF_ONLY";

export interface CheckoutMethodChooserProps {
  selectedMode: CheckoutMode;
  onSelectMode: (mode: CheckoutMode) => void;
  sellerName?: string;
}

export function CheckoutMethodChooser({
  selectedMode,
  onSelectMode,
  sellerName = "Brightline",
}: CheckoutMethodChooserProps) {
  return (
    <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm mb-6">
      <h3 className="font-heading font-bold text-base text-[#16191C] mb-1">
        How would you like to check out?
      </h3>
      <p className="text-xs text-[#4D534F] mb-4">
        We only offer actions this seller actually supports.
      </p>

      <div className="space-y-3">
        {/* Option 1: Sandbox Demo Checkout */}
        <div
          onClick={() => onSelectMode("DEMO_PAYPAL")}
          className={`rounded-xl p-4 cursor-pointer transition-all border-2 ${
            selectedMode === "DEMO_PAYPAL"
              ? "border-[#0E5A55] bg-white ring-1 ring-[#0E5A55]/20 shadow-sm"
              : "border-[#E2DDD0] bg-white hover:border-[#CCC8BE]"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-heading font-bold text-sm text-[#16191C]">
              Sandbox demo checkout
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF4E5] text-[#B45309]">
              Demo
            </span>
          </div>
          <p className="text-xs text-[#4D534F] leading-relaxed">
            Pay for the demo-store copy of this item with PayPal sandbox. Proves the full payment lifecycle without real funds.
          </p>
        </div>

        {/* Option 2: External Handoff */}
        <div
          onClick={() => onSelectMode("HANDOFF_ONLY")}
          className={`rounded-xl p-4 cursor-pointer transition-all border ${
            selectedMode === "HANDOFF_ONLY"
              ? "border-[#0E5A55] bg-white ring-1 ring-[#0E5A55]/20 shadow-sm"
              : "border-[#E2DDD0] bg-white hover:border-[#CCC8BE]"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-heading font-bold text-sm text-[#16191C]">
              Open the seller&apos;s page
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
              Handoff
            </span>
          </div>
          <p className="text-xs text-[#4D534F] leading-relaxed">
            {sellerName} has no supported checkout API, so you finish on their site. We cannot pay or edit their cart for you.
          </p>
        </div>
      </div>
    </div>
  );
}

