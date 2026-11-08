import React from "react";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";

export interface CandidateRowData {
  id: string;
  title: string;
  seller: string;
  provider: string;
  totalKnownCostFormatted: string;
  shippingNote: string;
  warrantyText: string;
  isWarrantyUnverified?: boolean;
  ramText: string;
  sellerConfidenceLevel: "High" | "Medium" | "Low";
  score: number;
}

interface CandidateTableProps {
  candidates: CandidateRowData[];
}

export function CandidateTable({ candidates }: CandidateTableProps) {
  return (
    <div className="bg-white rounded-[18px] border border-[#E2DDD0] overflow-hidden shadow-sm mb-8">
      <div className="p-6 border-b border-[#E2DDD0]">
        <h3 className="font-heading font-bold text-xl text-[#16191C] mb-1">
          Eligible candidates
        </h3>
        <p className="text-xs text-[#4D534F]">
          {candidates.length} of 16 offers pass every checkable constraint: unverified fields stay flagged. Sorted by value score.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#E2DDD0] bg-[#FAF8F5] text-[10px] uppercase font-mono font-bold text-[#4D534F]">
              <th className="py-3 px-6">Product</th>
              <th className="py-3 px-6">Total Known Cost</th>
              <th className="py-3 px-6">Warranty</th>
              <th className="py-3 px-6">RAM</th>
              <th className="py-3 px-6">Seller Confidence</th>
              <th className="py-3 px-6 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2DDD0]">
            {candidates.map((cand) => (
              <tr key={cand.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                <td className="py-4 px-6">
                  <div className="font-heading font-bold text-sm text-[#16191C]">
                    {cand.title}
                  </div>
                  <div className="text-[11px] text-[#4D534F] mt-0.5">
                    {cand.seller} &middot; {cand.provider}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="font-mono font-bold text-sm text-[#16191C]">
                    {cand.totalKnownCostFormatted}
                  </div>
                  <div className="text-[11px] text-[#4D534F]">
                    {cand.shippingNote}
                  </div>
                </td>
                <td className="py-4 px-6 font-medium">
                  {cand.isWarrantyUnverified ? (
                    <span className="text-[#7A3D00] bg-[#FBE6CC] px-2 py-0.5 rounded-full text-[11px]">
                      Not listed &middot; unverified
                    </span>
                  ) : (
                    <span className="text-[#16191C]">{cand.warrantyText}</span>
                  )}
                </td>
                <td className="py-4 px-6 text-[#16191C] font-mono">
                  {cand.ramText}
                </td>
                <td className="py-4 px-6">
                  <ProvenanceChip
                    kind={cand.sellerConfidenceLevel === "High" ? "verified" : "confirm"}
                    customLabel={cand.sellerConfidenceLevel}
                  />
                </td>
                <td className="py-4 px-6 text-right font-heading font-bold text-base text-[#16191C]">
                  {cand.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
