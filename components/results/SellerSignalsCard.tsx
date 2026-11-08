import React from "react";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";

export function SellerSignalsCard() {
  return (
    <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-base text-[#16191C]">
          Seller signals
        </h3>
        <ProvenanceChip kind="verified" customLabel="Confidence 88 / 100" />
      </div>

      <div className="space-y-3 mb-6 text-xs">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#E2DDD0]">
          <span className="text-[#16191C] font-medium">Seller identity</span>
          <ProvenanceChip kind="provider-reported" />
        </div>

        <div className="flex items-center justify-between pb-2.5 border-b border-[#E2DDD0]">
          <span className="text-[#16191C] font-medium">4.7 rating from 1,240 reviews</span>
          <ProvenanceChip kind="provider-reported" />
        </div>

        <div className="flex items-center justify-between pb-2.5 border-b border-[#E2DDD0]">
          <span className="text-[#16191C] font-medium">30-day return policy found</span>
          <ProvenanceChip kind="verified" />
        </div>

        <div className="flex items-center justify-between pb-2.5 border-b border-[#E2DDD0]">
          <span className="text-[#16191C] font-medium">Price within 6% of comparables</span>
          <ProvenanceChip kind="computed" />
        </div>

        <div className="flex items-center justify-between pb-2.5 border-b border-[#E2DDD0]">
          <span className="text-[#16191C] font-medium">Listing refreshed 3 minutes ago</span>
          <ProvenanceChip kind="verified" customLabel="Fresh" />
        </div>
      </div>

      <p className="text-[11px] text-[#4D534F] leading-relaxed italic">
        Risk signals, not a guarantee of safety. Open the original listing to check for yourself.
      </p>
    </div>
  );
}

