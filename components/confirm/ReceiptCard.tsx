import React from "react";
import Link from "next/link";

export interface ReceiptCardProps {
  itemTitle?: string;
  quantity?: number;
  merchantName?: string;
  planVersion?: number;
  planHash?: string;
  paypalOrderId?: string;
  captureStatus?: string;
  taxStatus?: string;
  onStartAnother?: () => void;
  onBackToComparison?: () => void;
}

export function ReceiptCard({
  itemTitle = "Halden Vector 16",
  quantity = 1,
  merchantName = "ProcurePilot Demo Store (sandbox)",
  planVersion = 3,
  planHash = "plan_7f3a9ce21b04",
  paypalOrderId = "[ORDER ID from PayPal]",
  captureStatus = "COMPLETED",
  taxStatus = "Not included",
  onStartAnother,
  onBackToComparison,
}: ReceiptCardProps) {
  const shortHash =
    planHash.length > 16
      ? `${planHash.slice(0, 11)}...${planHash.slice(-4)}`
      : planHash;

  return (
    <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm flex flex-col justify-between">
      <div>
        <h2 className="font-heading font-bold text-lg text-[#16191C] mb-6">
          Receipt
        </h2>

        <div className="space-y-4 text-xs">
          {/* Item */}
          <div className="flex items-center justify-between py-2 border-b border-[#E2DDD0]">
            <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F]">
              ITEM
            </span>
            <span className="font-semibold text-[#16191C]">
              {itemTitle} &times; {quantity}
            </span>
          </div>

          {/* Merchant */}
          <div className="flex items-center justify-between py-2 border-b border-[#E2DDD0]">
            <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F]">
              MERCHANT
            </span>
            <span className="font-semibold text-[#16191C]">{merchantName}</span>
          </div>

          {/* Plan */}
          <div className="flex items-center justify-between py-2 border-b border-[#E2DDD0]">
            <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F]">
              PLAN
            </span>
            <span className="font-mono text-[#16191C]">
              v{planVersion} &middot; {shortHash}
            </span>
          </div>

          {/* PayPal Order */}
          <div className="flex items-center justify-between py-2 border-b border-[#E2DDD0]">
            <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F]">
              PAYPAL ORDER
            </span>
            <span className="font-mono text-[#16191C]">{paypalOrderId}</span>
          </div>

          {/* Capture */}
          <div className="flex items-center justify-between py-2 border-b border-[#E2DDD0]">
            <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F]">
              CAPTURE
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DDEDEA] text-[#0A4743] border border-[#C5DFD9]">
              {captureStatus}
            </span>
          </div>

          {/* Tax */}
          <div className="flex items-center justify-between py-2 border-b border-[#E2DDD0]">
            <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F]">
              TAX
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF4E5] text-[#B45309]">
              {taxStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 mt-4">
        {onStartAnother ? (
          <button
            type="button"
            onClick={onStartAnother}
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-[12px] bg-[#0E5A55] text-white text-xs font-semibold hover:bg-[#0A4743] transition-colors shadow-sm"
          >
            Start another brief
          </button>
        ) : (
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-[12px] bg-[#0E5A55] text-white text-xs font-semibold hover:bg-[#0A4743] transition-colors shadow-sm"
          >
            Start another brief
          </Link>
        )}

        {onBackToComparison ? (
          <button
            type="button"
            onClick={onBackToComparison}
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-[12px] bg-white border border-[#E2DDD0] text-xs font-semibold text-[#16191C] hover:bg-neutral-50 transition-colors"
          >
            Back to comparison
          </button>
        ) : (
          <Link
            href="/compare"
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-[12px] bg-white border border-[#E2DDD0] text-xs font-semibold text-[#16191C] hover:bg-neutral-50 transition-colors"
          >
            Back to comparison
          </Link>
        )}
      </div>
    </div>
  );
}
