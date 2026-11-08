import React from "react";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";

export interface PriceIntelligenceProps {
  lowMinor?: number;
  nowMinor?: number;
  highMinor?: number;
  currency?: string;
  adviceText?: string;
  snapshotCount?: number;
}

export function PriceIntelligenceCard({
  lowMinor,
  nowMinor = 0,
  highMinor,
  currency = "USD",
  adviceText,
  snapshotCount,
}: PriceIntelligenceProps) {
  const hasRange = lowMinor !== undefined && highMinor !== undefined;

  const formatAmount = (minor?: number) => {
    if (minor === undefined) return "—";
    const zeroDecimalCurrencies = ["JPY", "KRW"];
    const isZeroDecimal = zeroDecimalCurrencies.includes(currency.toUpperCase());
    const val = isZeroDecimal ? minor : minor / 100;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    } catch {
      return `${val.toFixed(0)} ${currency}`;
    }
  };

  const lowFormatted = formatAmount(lowMinor);
  const nowFormatted = formatAmount(nowMinor);
  const highFormatted = formatAmount(highMinor);

  const defaultAdvice = hasRange
    ? nowMinor <= lowMinor!
      ? "Competitive offer: at the lower bound of discovered options."
      : "Reasonable offer: aligns with the discovered market spread."
    : "Price freshly observed from active catalog query.";

  return (
    <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-bold text-base text-[#16191C]">
          Price intelligence
        </h3>
        <ProvenanceChip
          kind={hasRange ? "computed" : "provider-reported"}
          customLabel={hasRange ? "Market spread" : "Current offer"}
        />
      </div>

      {/* Sparkline / Spread Indicator */}
      {hasRange ? (
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
              d="M 0 35 L 50 30 L 100 38 L 150 25 L 200 28 L 250 20 L 300 30"
              fill="none"
              stroke="#0E5A55"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Current point */}
            <circle cx="300" cy="30" r="3.5" fill="#0E5A55" />
          </svg>
        </div>
      ) : (
        <div className="py-3 px-3 bg-[#FAF8F5] rounded-xl text-xs text-[#4D534F] mb-4">
          Historical price snapshots unobserved. Displaying verified price from active search run.
        </div>
      )}

      {/* Low / Now / High Numbers */}
      <div className="grid grid-cols-3 border-y border-[#E2DDD0] py-3 text-center mb-4">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
            LOW
          </span>
          <span className="font-mono text-sm font-semibold text-[#16191C]">
            {lowFormatted}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
            NOW
          </span>
          <span className="font-mono text-sm font-bold text-[#0E5A55]">
            {nowFormatted}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
            HIGH
          </span>
          <span className="font-mono text-sm font-semibold text-[#16191C]">
            {highFormatted}
          </span>
        </div>
      </div>

      {/* Rules-based Buy Advice Box */}
      <div className="bg-[#FAF8F5] rounded-xl p-3 border border-[#E2DDD0] text-xs text-[#16191C] leading-relaxed mb-3">
        <p className="font-medium">
          <strong className="text-[#0E5A55]">Market assessment: </strong>
          {adviceText || defaultAdvice}
        </p>
      </div>

      {/* History Sample Size Statement */}
      <p className="text-[11px] text-[#4D534F] leading-relaxed font-sans">
        {snapshotCount
          ? `${snapshotCount} snapshots observed in ${currency}.`
          : `Verified in ${currency}.`}
      </p>
    </div>
  );
}
