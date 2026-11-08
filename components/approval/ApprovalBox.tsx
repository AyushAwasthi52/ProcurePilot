import React, { useState } from "react";

export interface ApprovalBoxProps {
  amountFormatted?: string;
  currency?: string;
  summaryText?: string;
  isApproved?: boolean;
  isLoading?: boolean;
  isExpired?: boolean;
  onApprove: () => void;
  onRefresh?: () => void;
  onProceedToCheckout?: () => void;
}

export function ApprovalBox({
  amountFormatted = "$1,649.00",
  currency = "USD",
  summaryText = "1 \u00d7 Halden Vector 16 from Brightline Electronics. Tax not included.",
  isApproved = false,
  isLoading = false,
  isExpired = false,
  onApprove,
  onRefresh,
  onProceedToCheckout,
}: ApprovalBoxProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="bg-white rounded-[22px] border-2 border-[#16191C] p-6 shadow-sm sticky top-6">
      {/* Eyebrow */}
      <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block mb-2 tracking-wide">
        YOUR APPROVAL
      </span>

      {/* Amount Display */}
      <div className="mb-2">
        <span className="font-heading font-bold text-3xl text-[#16191C] tracking-tight">
          {amountFormatted}
        </span>
        <span className="text-sm font-bold text-[#4D534F] ml-1.5 font-mono">
          {currency}
        </span>
      </div>

      {/* Summary line */}
      <p className="text-xs text-[#4D534F] mb-6 leading-relaxed">
        {summaryText}
      </p>

      {isExpired ? (
        <div className="bg-[#FFF4E5] rounded-xl p-4 border border-[#FCD34D] mb-4 text-xs text-[#B45309]">
          <p className="font-semibold mb-2">Purchase plan expired</p>
          <p className="mb-3">
            Prices and inventory may have shifted. Refresh the plan to lock current terms for another 10 minutes.
          </p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-[12px] bg-[#B45309] text-white font-semibold hover:bg-[#92400E] transition-colors"
          >
            {isLoading ? "Refreshing..." : "Refresh plan (re-verify terms)"}
          </button>
        </div>
      ) : isApproved ? (
        <div className="space-y-4 mb-4">
          <div className="bg-[#DDEDEA] rounded-xl p-4 border border-[#C5DFD9] text-xs text-[#0A4743]">
            <div className="flex items-center gap-2 font-bold mb-1">
              <span>&#10003;</span>
              <span>Approved by you</span>
            </div>
            <p>
              Exact amount {amountFormatted} {currency} bound to immutable plan hash. Ready for order creation.
            </p>
          </div>

          <button
            type="button"
            onClick={onProceedToCheckout}
            className="w-full py-3 px-4 rounded-[12px] bg-[#0E5A55] text-white font-semibold text-sm hover:bg-[#0A4743] shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Proceed to checkout</span>
            <span>&rarr;</span>
          </button>
        </div>
      ) : (
        <>
          {/* Agreement Checkbox Container */}
          <div
            onClick={() => setAgreed(!agreed)}
            className="bg-[#FAF8F5] rounded-xl p-4 border border-[#E2DDD0] mb-4 cursor-pointer hover:bg-[#F5F2EA] transition-colors flex items-start gap-3"
          >
            <input
              type="checkbox"
              id="approval-checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#CCC8BE] text-[#0E5A55] focus:ring-[#0E5A55] cursor-pointer"
            />
            <label
              htmlFor="approval-checkbox"
              className="text-xs font-medium text-[#16191C] leading-snug cursor-pointer select-none"
            >
              I have reviewed the item, seller, quantity, amount and currency, and I understand tax is not yet included.
            </label>
          </div>

          {/* Action Button */}
          <button
            type="button"
            disabled={!agreed || isLoading}
            onClick={onApprove}
            className={`w-full py-3 px-4 rounded-[12px] text-sm font-semibold transition-all ${
              agreed && !isLoading
                ? "bg-[#0E5A55] text-white hover:bg-[#0A4743] shadow-md cursor-pointer"
                : "bg-[#CCC8BE] text-[#7A7569] cursor-not-allowed"
            }`}
          >
            {isLoading ? "Recording approval..." : "Approve this exact amount"}
          </button>

          {/* Microcopy */}
          <span className="text-[11px] text-[#4D534F] text-center mt-3 block">
            Tick the box to enable approval. No payment call happens yet.
          </span>
        </>
      )}

      {/* Footer Disclaimer */}
      <div className="border-t border-[#E2DDD0] pt-4 mt-6 text-center">
        <p className="text-[11px] text-[#7A7569] leading-tight">
          Sandbox only. We never see or store your card or PayPal password.
        </p>
      </div>
    </div>
  );
}
