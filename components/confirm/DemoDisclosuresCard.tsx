import React from "react";

export function DemoDisclosuresCard() {
  return (
    <div className="bg-white rounded-[16px] border border-[#E2DDD0] p-4 shadow-sm mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <p className="text-xs text-[#4D534F] leading-relaxed">
        <strong className="text-[#16191C]">Demo disclosures.</strong> Product
        listings in this walkthrough come from a seeded demo catalog and live
        provider results, each labelled in the app. Payment used the PayPal
        sandbox; no funds moved and nothing will ship.
      </p>

      <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
        Scoring model v1.1
      </span>
    </div>
  );
}
