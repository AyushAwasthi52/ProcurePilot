import React from "react";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";

export function ExcludedPanels() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Over Budget Panel */}
      <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-heading font-bold text-sm text-[#16191C]">
            Over budget &middot; shown separately
          </h4>
          <ProvenanceChip kind="unverified" customLabel="Not a valid match" />
        </div>
        <div className="text-xs">
          <div className="font-heading font-bold text-sm text-[#16191C] mb-1">
            Halden Vector 16 Max
          </div>
          <p className="text-[#4D534F] leading-relaxed">
            <span className="font-mono font-semibold text-[#16191C]">$2,149.00</span> &middot; $349 over your cap &ndash; scores 90 on fit but breaks the hard budget.
          </p>
        </div>
      </div>

      {/* Flagged Panel */}
      <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-heading font-bold text-sm text-[#16191C]">
            Flagged &middot; excluded from ranking
          </h4>
          <ProvenanceChip kind="unverified" customLabel="Listing anomaly" />
        </div>
        <div className="text-xs">
          <div className="font-heading font-bold text-sm text-[#16191C] mb-1">
            Lumen Aero 16
          </div>
          <p className="text-[#4D534F] leading-relaxed">
            <span className="font-mono font-semibold text-[#16191C]">$899.00</span> &middot; 45% below comparable offers and no seller identity. We do not recommend it; inspect the listing yourself.
          </p>
        </div>
      </div>
    </div>
  );
}
