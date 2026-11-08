import React from "react";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";

export interface SellerSignalsProps {
  sellerConfidenceScore?: number;
  sellerRating?: number;
  ratingCount?: number;
  returnDays?: number;
  isIdentityVerified?: boolean;
}

export function SellerSignalsCard({
  sellerConfidenceScore = 88,
  sellerRating = 4.7,
  ratingCount = 1240,
  returnDays = 30,
  isIdentityVerified = true,
}: SellerSignalsProps) {
  return (
    <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-base text-[#16191C]">
          Seller signals
        </h3>
        <ProvenanceChip
          kind="verified"
          customLabel={`Confidence ${Math.round(sellerConfidenceScore)} / 100`}
        />
      </div>

      <div className="space-y-3 mb-6 text-xs">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#E2DDD0]">
          <span className="text-[#16191C] font-medium">Seller identity</span>
          <ProvenanceChip
            kind={isIdentityVerified ? "verified" : "unverified"}
            customLabel={isIdentityVerified ? "Identity verified" : "Unverified"}
          />
        </div>

        <div className="flex items-center justify-between pb-2.5 border-b border-[#E2DDD0]">
          <span className="text-[#16191C] font-medium">
            {sellerRating.toFixed(1)} rating from {ratingCount.toLocaleString()} reviews
          </span>
          <ProvenanceChip kind="provider-reported" />
        </div>

        <div className="flex items-center justify-between pb-2.5 border-b border-[#E2DDD0]">
          <span className="text-[#16191C] font-medium">
            {returnDays}-day return policy verified
          </span>
          <ProvenanceChip kind="verified" />
        </div>

        <div className="flex items-center justify-between pb-2.5 border-b border-[#E2DDD0]">
          <span className="text-[#16191C] font-medium">Pricing checked against market</span>
          <ProvenanceChip kind="computed" />
        </div>

        <div className="flex items-center justify-between pb-2.5 border-b border-[#E2DDD0]">
          <span className="text-[#16191C] font-medium">Listing freshly observed</span>
          <ProvenanceChip kind="verified" customLabel="Fresh" />
        </div>
      </div>

      <p className="text-[11px] text-[#4D534F] leading-relaxed italic">
        Risk signals, not a guarantee of safety. Open the original listing to check for yourself.
      </p>
    </div>
  );
}
