import React from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";

export default function HomePage() {
  return (
    <>
      <AppHeader currentStep="brief" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Purchasing Intelligence Eyebrow & Hero Header */}
        <div className="mb-8">
          <p className="text-[12px] font-bold tracking-widest text-[#4D534F] uppercase font-mono">
            Purchasing Intelligence
          </p>
          <h1 className="text-4xl sm:text-5xl font-heading font-bold tracking-tight text-[#16191C] mt-2 mb-4 leading-tight">
            Tell us what you need.
            <br />
            We show our work.
          </h1>
          <p className="text-base sm:text-lg text-[#4D534F] max-w-2xl leading-relaxed">
            Describe the purchase in plain language. ProcurePilot turns it into
            a checkable brief, compares real offers, explains the ranking, and
            never pays without your exact approval.
          </p>
        </div>

        {/* 2-Column Brief Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
          {/* Left Column: Your Request */}
          <div className="lg:col-span-6 bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold tracking-wider text-[#4D534F] uppercase">
                  Your Request
                </span>
              </div>

              {/* Request Box Preview */}
              <div className="bg-[#FAF8F5] rounded-xl p-4 border border-[#E2DDD0] text-[#16191C] text-sm leading-relaxed mb-4">
                A laptop for programming and ML experiments, some gaming on the
                side. Max $1,800 including shipping. Good thermals, upgradeable
                RAM, and at least a 2-year warranty.
              </div>

              {/* Request Metadata Chips */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
                  Region &middot; United States
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
                  Currency &middot; USD
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
                  Quantity &middot; 1
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
                  Urgency &middot; Normal
                </span>
              </div>

              {/* Clarification Card */}
              <div className="bg-[#FDF8F0] border border-[#F5D5B0] rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-[#7A3D00] text-sm">ⓘ</span>
                  <span className="text-xs font-semibold text-[#7A3D00]">
                    One question before we search
                  </span>
                </div>
                <p className="text-xs text-[#5C320A] mb-3 leading-relaxed">
                  Do your ML workloads need an NVIDIA GPU (CUDA)? This changes
                  which candidates are valid matches.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#DDEDEA] text-[#0A4743] border border-[#C5DFD9] hover:bg-[#cde4e0] transition-colors"
                  >
                    Yes, CUDA required
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-[#4D534F] border border-[#E2DDD0] hover:bg-neutral-50 transition-colors"
                  >
                    No, any GPU
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-[#4D534F] border border-[#E2DDD0] hover:bg-neutral-50 transition-colors"
                  >
                    Not sure, show both
                  </button>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[#E2DDD0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-xs text-[#4D534F]">
                Nothing is searched until you press the button.
              </span>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#0E5A55] text-white text-sm font-semibold hover:bg-[#0A4743] transition-colors shadow-sm"
              >
                <span>Search 3 sources</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>

          {/* Right Column: Your Structured Brief */}
          <div className="lg:col-span-6 bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-heading font-bold text-[#16191C]">
                  Your structured brief
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-[#E4E9F7] text-[#26397A] border border-[#D0DAF3]">
                  Schema v3 &middot; valid
                </span>
              </div>
              <p className="text-xs text-[#4D534F] mb-6">
                Every field shows where it came from. Edit anything before
                searching.
              </p>

              {/* Brief Rows */}
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD0]">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
                      Category
                    </span>
                    <span className="text-sm font-medium text-[#16191C]">
                      Laptop
                    </span>
                  </div>
                  <ProvenanceChip kind="inferred" />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD0]">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
                      Budget Cap
                    </span>
                    <span className="text-sm font-medium text-[#16191C]">
                      $1,800.00 USD &middot; shipping included
                    </span>
                  </div>
                  <ProvenanceChip kind="you-said" />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD0]">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
                      Must Have
                    </span>
                    <span className="text-sm font-medium text-[#16191C]">
                      Warranty &ge; 24 months &middot; RAM upgradeable
                    </span>
                  </div>
                  <ProvenanceChip kind="you-said" />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD0]">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
                      Must Have
                    </span>
                    <span className="text-sm font-medium text-[#16191C]">
                      Dedicated NVIDIA GPU (CUDA)
                    </span>
                  </div>
                  <ProvenanceChip kind="confirm" />
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD0]">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
                      Use Cases
                    </span>
                    <span className="text-sm font-medium text-[#16191C]">
                      Programming &middot; ML experiments &middot; light gaming
                    </span>
                  </div>
                  <ProvenanceChip kind="you-said" />
                </div>

                {/* Preference Weights */}
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block mb-3">
                    Preference Weights
                  </span>
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex justify-between text-xs text-[#16191C] mb-1">
                        <span>Thermals</span>
                        <span className="font-mono font-semibold">30</span>
                      </div>
                      <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0E5A55] h-full rounded-full"
                          style={{ width: "30%" }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#16191C] mb-1">
                        <span>Upgradeability</span>
                        <span className="font-mono font-semibold">25</span>
                      </div>
                      <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0E5A55] h-full rounded-full"
                          style={{ width: "25%" }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#16191C] mb-1">
                        <span>GPU performance</span>
                        <span className="font-mono font-semibold">25</span>
                      </div>
                      <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0E5A55] h-full rounded-full"
                          style={{ width: "25%" }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#16191C] mb-1">
                        <span>Battery life</span>
                        <span className="font-mono font-semibold">10</span>
                      </div>
                      <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0E5A55] h-full rounded-full"
                          style={{ width: "10%" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Source Status Strip */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-heading font-bold text-[#16191C]">
              Where offers come from
            </h2>
            <span className="text-xs text-[#4D534F]">
              Each source is labelled. If one fails, the others still answer.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading font-bold text-sm text-[#16191C]">
                  Seeded demo catalog
                </span>
                <ProvenanceChip kind="demo-data" />
              </div>
              <p className="text-xs text-[#4D534F] leading-relaxed">
                Stable fictional listings so the walkthrough always works. Never
                shown as live merchant pricing.
              </p>
            </div>

            <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading font-bold text-sm text-[#16191C]">
                  Catalog provider A
                </span>
                <ProvenanceChip kind="healthy" />
              </div>
              <p className="text-xs text-[#4D534F] leading-relaxed">
                Permitted API. Timeout 6 s. Results cached with a freshness
                label.
              </p>
            </div>

            <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-heading font-bold text-sm text-[#16191C]">
                  Catalog provider B
                </span>
                <ProvenanceChip kind="healthy" />
              </div>
              <p className="text-xs text-[#4D534F] leading-relaxed">
                Permitted API. Used for price history and seller signals.
              </p>
            </div>
          </div>
        </div>

        {/* Three Principles Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#16191C] rounded-[18px] p-6 text-white shadow-sm">
            <h3 className="font-heading font-bold text-base mb-2">
              Evidence first
            </h3>
            <p className="text-xs text-[#B2B8B5] leading-relaxed">
              Every claim carries its source, timestamp and a label: verified,
              estimated, stale or inferred.
            </p>
          </div>

          <div className="bg-[#16191C] rounded-[18px] p-6 text-white shadow-sm">
            <h3 className="font-heading font-bold text-base mb-2">
              Total value
            </h3>
            <p className="text-xs text-[#B2B8B5] leading-relaxed">
              Ranked on fit, shipping, warranty, seller confidence and price
              timing, not the lowest sticker price.
            </p>
          </div>

          <div className="bg-[#16191C] rounded-[18px] p-6 text-white shadow-sm">
            <h3 className="font-heading font-bold text-base mb-2">
              You hold the pen
            </h3>
            <p className="text-xs text-[#B2B8B5] leading-relaxed">
              Money moves only after you approve the exact item, seller, amount
              and currency.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

