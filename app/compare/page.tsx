"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { ScoreRing } from "@/components/results/ScoreRing";
import { PriceIntelligenceCard } from "@/components/results/PriceIntelligenceCard";
import { SellerSignalsCard } from "@/components/results/SellerSignalsCard";
import { CandidateTable, CandidateRowData } from "@/components/results/CandidateTable";
import { ExcludedPanels } from "@/components/results/ExcludedPanels";

const CANDIDATES: CandidateRowData[] = [
  {
    id: "ofr_vector_16",
    title: "Halden Vector 16",
    seller: "Brightline Electronics",
    provider: "Provider A",
    totalKnownCostFormatted: "$1,649.00",
    shippingNote: "Free shipping &middot; tax unknown",
    warrantyText: "36 months",
    ramText: "32 GB &middot; 2 slots",
    sellerConfidenceLevel: "High",
    score: 86,
  },
  {
    id: "ofr_kestrel_16",
    title: "Kestrel Pro 16",
    seller: "Northgate Direct",
    provider: "Demo catalog",
    totalKnownCostFormatted: "$1,742.00",
    shippingNote: "$42 shipping &middot; tax unknown",
    warrantyText: "24 months",
    ramText: "32 GB &middot; 2 slots",
    sellerConfidenceLevel: "High",
    score: 81,
  },
  {
    id: "ofr_orbis_15",
    title: "Orbis Atlas 15",
    seller: "ValueHub",
    provider: "Provider A",
    totalKnownCostFormatted: "$1,479.00",
    shippingNote: "Shipping unknown",
    warrantyText: "Not listed",
    isWarrantyUnverified: true,
    ramText: "16 GB &middot; 2 slots",
    sellerConfidenceLevel: "Medium",
    score: 78,
  },
];

export default function ComparePage() {
  const router = useRouter();

  return (
    <>
      <AppHeader currentStep="compare" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Brief Summary Bar */}
        <div className="bg-white rounded-2xl border border-[#E2DDD0] p-4 sm:p-5 shadow-sm mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-heading font-bold text-base text-[#16191C] mr-2">
              Laptop for programming + ML
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
              Cap $1,800 incl. shipping
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
              NVIDIA GPU required
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
              Warranty &ge; 24 mo
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
              RAM upgradeable
            </span>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-semibold text-[#16191C] bg-white border border-[#E2DDD0] hover:bg-neutral-50 transition-colors self-start md:self-auto"
          >
            Edit brief
          </Link>
        </div>

        {/* Source Run Status Strip */}
        <div className="flex flex-wrap items-center gap-3 text-xs mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2DDD0]">
            <span className="text-[#16191C]">Seeded demo catalog &middot; 6 offers</span>
            <ProvenanceChip kind="demo-data" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2DDD0]">
            <span className="text-[#16191C]">Provider A &middot; 8 offers &middot; refreshed 3 min ago</span>
            <ProvenanceChip kind="healthy" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2DDD0]">
            <span className="text-[#7A3D00]">Provider B &middot; timed out after 6 s &middot; partial results</span>
            <button
              type="button"
              className="text-xs font-semibold text-[#0E5A55] underline hover:text-[#0A4743]"
            >
              Retry Provider B
            </button>
          </div>
        </div>

        {/* 2-Column Main Evaluation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left Column: Recommendation Card */}
          <div className="lg:col-span-7 bg-white rounded-[18px] border border-[#E2DDD0] p-6 sm:p-7 shadow-sm flex flex-col justify-between">
            <div>
              {/* Card Header & Score Ring */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DDEDEA] text-[#0A4743] border border-[#C5DFD9] mb-2">
                    Best fit for your brief
                  </span>
                  <h2 className="text-3xl font-heading font-bold text-[#16191C] leading-tight">
                    Halden Vector 16
                  </h2>
                  <p className="text-xs text-[#4D534F] mt-1">
                    Brightline Electronics &middot; via Provider A &middot; seller identity provider-reported
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <ScoreRing score={86} />
                  <span className="text-[10px] font-mono text-[#4D534F] mt-1 whitespace-nowrap">
                    model v1.1 &middot; confidence high
                  </span>
                </div>
              </div>

              {/* Price Display */}
              <div className="mb-6">
                <div className="font-heading font-bold text-3xl text-[#16191C] tracking-tight">
                  $1,649.00
                </div>
                <div className="text-xs text-[#4D534F] mt-0.5">
                  total known cost &middot; free shipping &middot; tax unknown
                </div>
              </div>

              {/* Why This One Box */}
              <div className="bg-[#FAF8F5] rounded-xl p-4 border border-[#E2DDD0] mb-6">
                <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block mb-1.5">
                  Why this one
                </span>
                <p className="text-xs text-[#16191C] leading-relaxed">
                  Highest requirement fit: 32 GB RAM across two upgradeable slots, a 36-month warranty and the strongest thermal score of the eligible set. It costs $170 more than the cheapest option, and that gap buys complete seller data and an extra year of cover.
                </p>
              </div>

              {/* Score Breakdown Table */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 text-[10px] uppercase font-mono text-[#4D534F] border-b border-[#E2DDD0] pb-2">
                  <span className="font-bold">Score breakdown</span>
                  <span>weight &times; score = points</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="font-medium text-[#16191C]">Requirement fit</span>
                        <span className="text-[11px] text-[#4D534F] block">All must-haves met</span>
                      </div>
                      <span className="font-mono text-xs text-[#4D534F]">
                        35% &times; 92 = <strong>32.2</strong>
                      </span>
                    </div>
                    <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#0E5A55] h-full rounded-full" style={{ width: "92%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="font-medium text-[#16191C]">Performance per dollar</span>
                        <span className="text-[11px] text-[#4D534F] block">Category benchmark</span>
                      </div>
                      <span className="font-mono text-xs text-[#4D534F]">
                        25% &times; 84 = <strong>21.0</strong>
                      </span>
                    </div>
                    <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#0E5A55] h-full rounded-full" style={{ width: "84%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="font-medium text-[#16191C]">Price attractiveness</span>
                        <span className="text-[11px] text-[#4D534F] block">14 snapshots</span>
                      </div>
                      <span className="font-mono text-xs text-[#4D534F]">
                        15% &times; 71 = <strong>10.7</strong>
                      </span>
                    </div>
                    <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#0E5A55] h-full rounded-full" style={{ width: "71%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="font-medium text-[#16191C]">Seller confidence</span>
                        <span className="text-[11px] text-[#4D534F] block">Evidence complete</span>
                      </div>
                      <span className="font-mono text-xs text-[#4D534F]">
                        15% &times; 88 = <strong>13.2</strong>
                      </span>
                    </div>
                    <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#0E5A55] h-full rounded-full" style={{ width: "88%" }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="font-medium text-[#16191C]">Ownership value</span>
                        <span className="text-[11px] text-[#4D534F] block">Warranty, returns</span>
                      </div>
                      <span className="font-mono text-xs text-[#4D534F]">
                        10% &times; 90 = <strong>9.0</strong>
                      </span>
                    </div>
                    <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#0E5A55] h-full rounded-full" style={{ width: "90%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[#E2DDD0]">
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => router.push("/approve")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[12px] bg-[#0E5A55] text-white text-sm font-semibold hover:bg-[#0A4743] transition-colors shadow-sm"
                >
                  <span>Review purchase plan</span>
                  <span>&rarr;</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("eligible-candidates-section");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-[12px] bg-white border border-[#E2DDD0] text-sm font-semibold text-[#16191C] hover:bg-neutral-50 transition-colors"
                >
                  Compare all candidates
                </button>
              </div>
              <span className="text-[11px] text-[#4D534F]">
                No payment call happens until you approve
              </span>
            </div>
          </div>

          {/* Right Column: Price Intelligence & Seller Signals */}
          <div className="lg:col-span-5 space-y-6">
            <PriceIntelligenceCard />
            <SellerSignalsCard />
          </div>
        </div>

        {/* Eligible Candidates Table */}
        <div id="eligible-candidates-section">
          <CandidateTable candidates={CANDIDATES} />
        </div>

        {/* Excluded Panels (Over budget & Flagged) */}
        <ExcludedPanels />
      </main>
    </>
  );
}

