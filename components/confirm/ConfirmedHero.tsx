import React from "react";

export interface ConfirmedHeroProps {
  amountFormatted?: string;
  currency?: string;
}

export function ConfirmedHero({
  amountFormatted = "$1,649.00",
  currency = "USD",
}: ConfirmedHeroProps) {
  return (
    <div className="bg-[#0E5A55] rounded-[22px] p-6 sm:p-8 text-white mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
      {/* Left side: Heading & verified note */}
      <div className="max-w-xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#0A4743] border border-[#166E68] text-white mb-4">
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="uppercase tracking-wider text-[10px]">
            Payment verified
          </span>
        </div>

        <h1 className="font-heading font-bold text-3xl sm:text-4xl text-white tracking-tight mb-2">
          Paid, and confirmed by PayPal.
        </h1>

        <p className="text-xs sm:text-sm text-[#DDEDEA] leading-relaxed">
          We marked this paid only after the server verified the capture with
          PayPal, then reconciled it against the webhook event.
        </p>
      </div>

      {/* Right side: Amount captured */}
      <div className="md:text-right shrink-0">
        <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#A2CFC9] block mb-1">
          Amount captured
        </span>
        <div className="font-heading font-bold text-4xl sm:text-5xl text-white tracking-tight">
          {amountFormatted}
        </div>
        <span className="text-xs font-mono text-[#DDEDEA] mt-1 block">
          {currency} &middot; sandbox transaction
        </span>
      </div>
    </div>
  );
}
