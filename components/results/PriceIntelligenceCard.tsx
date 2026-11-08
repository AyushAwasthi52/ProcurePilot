import React from "react";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";

export function PriceIntelligenceCard() {
  return (
    <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-base text-[#16191C]">
          Price intelligence
        </h3>
        <ProvenanceChip kind="inferred" customLabel="Observed history" />
      </div>

      {/* Sparkline Graph */}
      <div className="h-16 w-full mb-4 flex items-end">
        <svg viewBox="0 0 300 60" className="w-full h-full overflow-visible">
          {/* Subtle grid line */}
          <line
            x1="0"
            y1="30"
            x2="300"
            y2="30"
            stroke="#E2DDD0"
            strokeDasharray="4 4"
          />
          {/* Sparkline trend path */}
          <path
            d="M 0 20 L 40 25 L 80 18 L 120 28 L 160 30 L 200 24 L 240 32 L 280 42 L 300 38"
            fill="none"
            stroke="#0E5A55"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Current point */}
          <circle cx="300" cy="38" r="3.5" fill="#0E5A55" />
        </svg>
      </div>

      {/* Low / Now / High Numbers */}
      <div className="grid grid-cols-3 border-y border-[#E2DDD0] py-3 text-center mb-4">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
            LOW
          </span>
          <span className="font-mono text-sm font-semibold text-[#16191C]">
            $1,629
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
            NOW
          </span>
          <span className="font-mono text-sm font-bold text-[#0E5A55]">
            $1,649
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
            HIGH
          </span>
          <span className="font-mono text-sm font-semibold text-[#16191C]">
            $1,719
          </span>
        </div>
      </div>

      {/* Rules-based Buy Advice Box */}
      <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#E2DDD0] text-xs text-[#16191C] leading-relaxed mb-3">
        <p className="font-medium">
          <strong className="text-[#0E5A55]">Reasonable to buy now.</strong> Price sits $30 under the 23-day median and urgency is normal.
        </p>
      </div>

      {/* History Sample Size Statement */}
      <p className="text-[11px] text-[#4D534F] leading-relaxed font-sans">
        14 snapshots &middot; Oct 9 &ndash; Nov 7 &middot; 2 sources. That&apos;s enough for a median, not enough to call this a historic low.
      </p>
    </div>
  );
}
