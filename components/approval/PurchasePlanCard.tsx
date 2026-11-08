import React from "react";

export interface PurchasePlanCardProps {
  planVersion?: number;
  planHash?: string;
  itemTitle?: string;
  specsSummary?: string;
  quantity?: number;
  sellerName?: string;
  sellerType?: string;
  itemPriceFormatted?: string;
  shippingFormatted?: string;
  shippingNote?: string;
  taxNote?: string;
  totalKnownCostFormatted?: string;
  currency?: string;
  reverifiedSecondsAgo?: number;
  validMinutes?: number;
  warrantyText?: string;
}

export function PurchasePlanCard({
  planVersion = 3,
  planHash = "plan_7f3a9ce21b04",
  itemTitle = "Halden Vector 16",
  specsSummary = "32 GB \u00b7 1 TB",
  quantity = 1,
  sellerName = "Brightline Electronics",
  itemPriceFormatted = "$1,649.00",
  shippingFormatted = "$0.00",
  shippingNote = "merchant-stated",
  taxNote = "not included in total",
  totalKnownCostFormatted = "$1,649.00",
  currency = "USD",
  reverifiedSecondsAgo = 38,
  validMinutes = 10,
  warrantyText = "30-day returns \u00b7 36-mo warranty",
}: PurchasePlanCardProps) {
  const shortHash = planHash.length > 16 
    ? `${planHash.slice(0, 11)}...${planHash.slice(-4)}`
    : planHash;

  return (
    <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E2DDD0] mb-4">
        <h2 className="font-heading font-bold text-lg text-[#16191C]">
          Purchase plan
        </h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#EEF3F8] text-[#2B4365] border border-[#DCE5EF]">
          v{planVersion} &middot; {shortHash}
        </span>
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        {/* Item */}
        <div>
          <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block mb-1">
            ITEM
          </span>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-[#16191C]">
              {itemTitle} &middot; {specsSummary}
            </span>
            <span className="font-mono font-bold text-[#4D534F]">
              &times; {quantity}
            </span>
          </div>
        </div>

        <div className="border-t border-[#E2DDD0] pt-3">
          <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block mb-1">
            SELLER
          </span>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-[#16191C]">{sellerName}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E8F1FC] text-[#1D4ED8]">
              Provider-reported
            </span>
          </div>
        </div>

        <div className="border-t border-[#E2DDD0] pt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F]">
              ITEM PRICE
            </span>
            <span className="font-mono font-semibold text-[#16191C]">
              {itemPriceFormatted}
            </span>
          </div>
        </div>

        <div className="border-t border-[#E2DDD0] pt-3">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F]">
              SHIPPING
            </span>
            <div className="text-right">
              <span className="font-mono font-semibold text-[#16191C] mr-2">
                {shippingFormatted}
              </span>
              <span className="text-xs text-[#4D534F]">{shippingNote}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E2DDD0] pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F]">
              TAX
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FFF4E5] text-[#B45309]">
                Unknown
              </span>
              <span className="text-xs text-[#4D534F]">{taxNote}</span>
            </div>
          </div>
        </div>

        {/* Total Known Cost */}
        <div className="border-t-2 border-[#16191C] pt-4 mt-2">
          <div className="flex items-baseline justify-between">
            <span className="font-heading font-bold text-base text-[#16191C]">
              Total known cost
            </span>
            <div className="text-right">
              <span className="font-heading font-bold text-3xl text-[#16191C] tracking-tight">
                {totalKnownCostFormatted}
              </span>
              <span className="text-sm font-bold text-[#4D534F] ml-1.5 font-mono">
                {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Verification and Coverage Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DDEDEA] text-[#0A4743] border border-[#C5DFD9]">
            Price and stock re-verified {reverifiedSecondsAgo} s ago
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
            Valid for {validMinutes} min
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DDEDEA] text-[#0A4743] border border-[#C5DFD9]">
            {warrantyText}
          </span>
        </div>
      </div>
    </div>
  );
}

