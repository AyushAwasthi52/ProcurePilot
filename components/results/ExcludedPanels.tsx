import React from "react";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { ExcludedCandidate } from "@/src/domain/scoring/evaluator";

interface ExcludedPanelsProps {
  overBudgetCandidates?: ExcludedCandidate[];
  flaggedCandidates?: ExcludedCandidate[];
}

export function ExcludedPanels({
  overBudgetCandidates = [],
  flaggedCandidates = [],
}: ExcludedPanelsProps) {
  if (overBudgetCandidates.length === 0 && flaggedCandidates.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Over Budget Panel */}
      {overBudgetCandidates.length > 0 && (
        <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-heading font-bold text-sm text-[#16191C]">
              Over budget &middot; shown separately ({overBudgetCandidates.length})
            </h4>
            <ProvenanceChip kind="unverified" customLabel="Not a valid match" />
          </div>
          <div className="space-y-4">
            {overBudgetCandidates.map((c) => (
              <div key={c.offer.id} className="text-xs pb-3 border-b border-[#E2DDD0] last:border-0 last:pb-0">
                <div className="font-heading font-bold text-sm text-[#16191C] mb-1">
                  {c.offer.productTitle}
                </div>
                <p className="text-[#4D534F] leading-relaxed">
                  <span className="font-mono font-semibold text-[#16191C]">
                    ${(c.offer.totalKnownMinor / 100).toFixed(2)} {c.offer.currency}
                  </span>{" "}
                  &middot; {c.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flagged Panel */}
      {flaggedCandidates.length > 0 && (
        <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-heading font-bold text-sm text-[#16191C]">
              Flagged &middot; excluded from ranking ({flaggedCandidates.length})
            </h4>
            <ProvenanceChip kind="unverified" customLabel="Listing anomaly" />
          </div>
          <div className="space-y-4">
            {flaggedCandidates.map((c) => (
              <div key={c.offer.id} className="text-xs pb-3 border-b border-[#E2DDD0] last:border-0 last:pb-0">
                <div className="font-heading font-bold text-sm text-[#16191C] mb-1">
                  {c.offer.productTitle}
                </div>
                <p className="text-[#4D534F] leading-relaxed">
                  <span className="font-mono font-semibold text-[#16191C]">
                    ${(c.offer.priceMinor / 100).toFixed(2)} {c.offer.currency}
                  </span>{" "}
                  &middot; {c.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
