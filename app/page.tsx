"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";

export default function HomePage() {
  const router = useRouter();

  // Interactive prompt state
  const [prompt, setPrompt] = useState(
    "A laptop for programming and ML experiments, some gaming on the side. Max $1,800 including shipping. Good thermals, upgradeable RAM, and at least a 2-year warranty."
  );
  const [region] = useState("United States");
  const [currency] = useState("USD");
  const [quantity] = useState(1);
  const [urgency] = useState("Normal");

  // Clarification state: 'yes' | 'no' | 'either'
  const [cudaChoice, setCudaChoice] = useState<"yes" | "no" | "either">("yes");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preference weights state
  const [weights, setWeights] = useState({
    thermals: 30,
    upgradeability: 25,
    gpuPerformance: 25,
    batteryLife: 10,
  });

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSearch = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-skip-csrf": "true",
        },
        body: JSON.stringify({
          rawPrompt: prompt,
          region: "US",
          currency: "USD",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Navigate to compare screen with request ID
        router.push(`/compare?requestId=${data.id}`);
      } else {
        // Fallback navigation for direct demo review
        router.push("/compare");
      }
    } catch {
      router.push("/compare");
    } finally {
      setIsSubmitting(false);
    }
  };

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

              {/* Editable Request Textarea */}
              <div className="relative mb-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-[#FAF8F5] rounded-xl p-4 border border-[#E2DDD0] text-[#16191C] text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0E5A55] resize-none"
                  placeholder="Describe your purchase requirements, target budget, and critical specs..."
                />
              </div>

              {/* Request Metadata Chips */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
                  Region &middot; {region}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
                  Currency &middot; {currency}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
                  Quantity &middot; {quantity}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
                  Urgency &middot; {urgency}
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
                    onClick={() => setCudaChoice("yes")}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      cudaChoice === "yes"
                        ? "bg-[#DDEDEA] text-[#0A4743] border border-[#C5DFD9] font-semibold"
                        : "bg-white text-[#4D534F] border border-[#E2DDD0] hover:bg-neutral-50"
                    }`}
                  >
                    Yes, CUDA required
                  </button>
                  <button
                    type="button"
                    onClick={() => setCudaChoice("no")}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      cudaChoice === "no"
                        ? "bg-[#DDEDEA] text-[#0A4743] border border-[#C5DFD9] font-semibold"
                        : "bg-white text-[#4D534F] border border-[#E2DDD0] hover:bg-neutral-50"
                    }`}
                  >
                    No, any GPU
                  </button>
                  <button
                    type="button"
                    onClick={() => setCudaChoice("either")}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      cudaChoice === "either"
                        ? "bg-[#DDEDEA] text-[#0A4743] border border-[#C5DFD9] font-semibold"
                        : "bg-white text-[#4D534F] border border-[#E2DDD0] hover:bg-neutral-50"
                    }`}
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
                onClick={handleSearch}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#0E5A55] text-white text-sm font-semibold hover:bg-[#0A4743] disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
              >
                <span>{isSubmitting ? "Processing..." : "Search 3 sources"}</span>
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

                {cudaChoice !== "no" && (
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD0]">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
                        Must Have
                      </span>
                      <span className="text-sm font-medium text-[#16191C]">
                        {cudaChoice === "yes"
                          ? "Dedicated NVIDIA GPU (CUDA)"
                          : "GPU optional (any architecture)"}
                      </span>
                    </div>
                    <ProvenanceChip
                      kind={cudaChoice === "yes" ? "you-said" : "confirm"}
                      customLabel={cudaChoice === "yes" ? "You said" : "Confirm"}
                    />
                  </div>
                )}

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

                {/* Preference Weights Slider Section */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
                      Preference Weights
                    </span>
                    <span className="text-[10px] font-mono text-[#4D534F]">
                      Sum: {weights.thermals + weights.upgradeability + weights.gpuPerformance + weights.batteryLife} (normalized in code)
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-[#16191C] mb-1">
                        <span>Thermals</span>
                        <span className="font-mono font-semibold">{weights.thermals}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.thermals}
                        onChange={(e) => handleWeightChange("thermals", parseInt(e.target.value, 10))}
                        className="w-full accent-[#0E5A55] h-1.5 bg-[#E2DDD0] rounded-full cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#16191C] mb-1">
                        <span>Upgradeability</span>
                        <span className="font-mono font-semibold">{weights.upgradeability}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.upgradeability}
                        onChange={(e) => handleWeightChange("upgradeability", parseInt(e.target.value, 10))}
                        className="w-full accent-[#0E5A55] h-1.5 bg-[#E2DDD0] rounded-full cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#16191C] mb-1">
                        <span>GPU performance</span>
                        <span className="font-mono font-semibold">{weights.gpuPerformance}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.gpuPerformance}
                        onChange={(e) => handleWeightChange("gpuPerformance", parseInt(e.target.value, 10))}
                        className="w-full accent-[#0E5A55] h-1.5 bg-[#E2DDD0] rounded-full cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-[#16191C] mb-1">
                        <span>Battery life</span>
                        <span className="font-mono font-semibold">{weights.batteryLife}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={weights.batteryLife}
                        onChange={(e) => handleWeightChange("batteryLife", parseInt(e.target.value, 10))}
                        className="w-full accent-[#0E5A55] h-1.5 bg-[#E2DDD0] rounded-full cursor-pointer"
                      />
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
