"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { ScoreRing } from "@/components/results/ScoreRing";
import { PriceIntelligenceCard } from "@/components/results/PriceIntelligenceCard";
import { SellerSignalsCard } from "@/components/results/SellerSignalsCard";
import { CandidateTable, CandidateRowData } from "@/components/results/CandidateTable";
import { ExcludedPanels } from "@/components/results/ExcludedPanels";
import { evaluateAndRankOffers, SearchEvaluationResult } from "@/src/domain/scoring/evaluator";
import { PurchaseBrief } from "@/src/ai/schemas/brief";
import { ProviderOutcome, SearchRunResult } from "@/src/discovery/search-orchestrator";
import { getCsrfHeaders } from "@/src/auth/client-csrf";

function formatSpecs(attributes: Record<string, unknown>, category?: string): string {
  if (category === "Laptop" || attributes.ramGb) {
    const ram = attributes.ramGb ? `${attributes.ramGb} GB` : "";
    const slots = attributes.ramSlots ? `${attributes.ramSlots} slots` : "";
    return [ram, slots].filter(Boolean).join(" \u00b7 ") || "Laptop specs";
  }
  if (category === "Headphones" || attributes.anc !== undefined) {
    const anc = attributes.anc ? "ANC" : "Passive";
    const battery = attributes.batteryHours ? `${attributes.batteryHours}h battery` : "";
    return [anc, battery].filter(Boolean).join(" \u00b7 ") || "Audio specs";
  }
  if (category === "Smartphone" || attributes.os) {
    const os = attributes.os ? String(attributes.os) : "";
    const storage = attributes.storageGb ? `${attributes.storageGb} GB` : "";
    return [os, storage].filter(Boolean).join(" \u00b7 ") || "Mobile specs";
  }
  if (category === "Monitor" || attributes.refreshRateHz) {
    const screen = attributes.screenInches ? `${attributes.screenInches}"` : "";
    const res = attributes.resolution ? String(attributes.resolution) : "";
    const hz = attributes.refreshRateHz ? `${attributes.refreshRateHz}Hz` : "";
    return [screen, res, hz].filter(Boolean).join(" \u00b7 ") || "Display specs";
  }
  const keys = Object.keys(attributes).slice(0, 2);
  if (keys.length > 0) {
    return keys.map((k) => `${k}: ${String(attributes[k])}`).join(" \u00b7 ");
  }
  return "Standard specs";
}

function CompareContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<PurchaseBrief | null>(null);
  const [evalResult, setEvalResult] = useState<SearchEvaluationResult | null>(null);
  const [providerOutcomes, setProviderOutcomes] = useState<Record<string, ProviderOutcome>>({});

  const executeDiscovery = async (reqId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Fetch Purchase Request and Brief
      const reqRes = await fetch(`/api/purchase-requests/${reqId}`);
      if (!reqRes.ok) {
        throw new Error("Could not find the specified purchase request");
      }
      const reqData = await reqRes.json();
      const currentBrief = reqData.brief as PurchaseBrief;
      setBrief(currentBrief);

      // 2. Launch or await Search Orchestration
      const csrfHeaders = await getCsrfHeaders();
      const searchRes = await fetch(`/api/purchase-requests/${reqId}/search`, {
        method: "POST",
        headers: {
          "x-sync-search": "true",
          ...csrfHeaders,
        },
      });

      if (!searchRes.ok) {
        throw new Error("Provider search execution failed");
      }

      const searchData = (await searchRes.json()) as SearchRunResult;
      setProviderOutcomes(searchData.providerOutcomes || {});

      // 3. Pure Domain Evaluation & Ranking
      const evaluated = evaluateAndRankOffers(searchData.offers || [], currentBrief);
      setEvalResult(evaluated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load comparison data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (requestId) {
      executeDiscovery(requestId);
    } else {
      setIsLoading(false);
    }
  }, [requestId]);

  // Loading State
  if (isLoading) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0E5A55] border-t-transparent mb-4" />
        <h2 className="text-xl font-heading font-bold text-[#16191C] mb-2">
          Searching providers & evaluating offers...
        </h2>
        <p className="text-xs text-[#4D534F] max-w-md mx-auto">
          Querying seeded catalog and permitted provider APIs in parallel. Scoring fit, calculating total known costs, and verifying trust signals.
        </p>
      </main>
    );
  }

  // No Request Specified Fallback
  if (!requestId) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-heading font-bold text-[#16191C] mb-3">
          No purchase request active
        </h2>
        <p className="text-sm text-[#4D534F] max-w-md mx-auto mb-6">
          Start by describing your purchasing requirements on the home screen.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[12px] bg-[#0E5A55] text-white text-sm font-semibold hover:bg-[#0A4743] transition-colors"
        >
          <span>Start new purchase request</span>
          <span>&rarr;</span>
        </Link>
      </main>
    );
  }

  // Error State
  if (error || !brief || !evalResult) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-[#FFF0F0] border border-[#FFD0D0] text-[#A00000] p-6 rounded-2xl max-w-xl mx-auto mb-6">
          <h3 className="font-heading font-bold text-lg mb-2">Discovery encountered an error</h3>
          <p className="text-xs">{error || "Unable to complete evaluation."}</p>
        </div>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => executeDiscovery(requestId)}
            className="px-5 py-2 rounded-xl bg-[#0E5A55] text-white text-xs font-semibold"
          >
            Retry search
          </button>
          <Link
            href="/"
            className="px-5 py-2 rounded-xl bg-white border border-[#E2DDD0] text-xs font-semibold text-[#16191C]"
          >
            Edit brief
          </Link>
        </div>
      </main>
    );
  }

  const { recommended, eligibleCandidates, overBudgetCandidates, flaggedCandidates } = evalResult;

  // Format Candidate Table Rows
  const candidateRows: CandidateRowData[] = eligibleCandidates.map((c) => {
    const isFreeShipping = c.offer.shippingStatus === "KNOWN" && (c.offer.shippingMinor === 0 || c.offer.shippingMinor === null);
    const shippingNote =
      c.offer.shippingStatus === "KNOWN"
        ? isFreeShipping
          ? "Free shipping \u00b7 tax unknown"
          : `$${((c.offer.shippingMinor || 0) / 100).toFixed(2)} shipping \u00b7 tax unknown`
        : "Shipping unknown";

    return {
      id: c.offer.id,
      title: c.offer.productTitle,
      seller: c.offer.merchantName,
      provider: c.offer.providerId === "seeded_demo" ? "Demo catalog" : c.offer.providerId,
      totalKnownCostFormatted: `$${(c.offer.totalKnownMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      shippingNote,
      warrantyText: c.offer.warrantyMonths ? `${c.offer.warrantyMonths} months` : "Not listed",
      isWarrantyUnverified: !c.offer.warrantyMonths,
      specsText: formatSpecs(c.offer.attributes, brief.category),
      sellerConfidenceLevel:
        c.score.components.sellerConfidence >= 80
          ? "High"
          : c.score.components.sellerConfidence >= 60
          ? "Medium"
          : "Low",
      score: c.score.displayedScore,
    };
  });

  return (
    <>
      <AppHeader currentStep="compare" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Dynamic Brief Summary Bar */}
        <div className="bg-white rounded-2xl border border-[#E2DDD0] p-4 sm:p-5 shadow-sm mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="font-heading font-bold text-base text-[#16191C] mr-2">
              {brief.category}: {brief.query}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]">
              Cap ${(brief.budget.amountMinor / 100).toLocaleString("en-US")} {brief.budget.currency}{" "}
              {brief.budget.includesShipping ? "incl. shipping" : ""}
            </span>
            {brief.mustHave.map((mh, idx) => (
              <span
                key={mh.attribute + idx}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]"
              >
                {mh.label || `${mh.attribute} ${mh.operator} ${String(mh.value)}`}
              </span>
            ))}
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-semibold text-[#16191C] bg-white border border-[#E2DDD0] hover:bg-neutral-50 transition-colors self-start md:self-auto"
          >
            Edit brief
          </Link>
        </div>

        {/* Dynamic Source Run Status Strip */}
        <div className="flex flex-wrap items-center gap-3 text-xs mb-8">
          {Object.entries(providerOutcomes).map(([providerId, outcome]) => {
            const isSeeded = providerId === "seeded_demo";
            const label = isSeeded
              ? "Seeded demo catalog"
              : providerId === "provider_a"
              ? "Catalog provider A"
              : providerId === "provider_b"
              ? "Catalog provider B"
              : providerId;

            const isUnconfigured = outcome.status === "UNCONFIGURED";
            const isTimedOut = outcome.status === "TIMED_OUT";
            const isFailed = outcome.status === "FAILED";

            if (outcome.status === "COMPLETED") {
              return (
                <div
                  key={providerId}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2DDD0]"
                >
                  <span className="text-[#16191C]">
                    {label} &middot; {outcome.offerCount} offers &middot; {outcome.latencyMs}ms
                  </span>
                  <ProvenanceChip
                    kind={outcome.kind === "DEMO" ? "demo-data" : "healthy"}
                    customLabel={outcome.kind === "DEMO" ? "Demo fixture" : "Live verified"}
                  />
                </div>
              );
            }

            return (
              <div
                key={providerId}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E2DDD0]"
              >
                <span className="text-[#7A3D00]">
                  {label} &middot;{" "}
                  {isUnconfigured
                    ? "Unconfigured"
                    : isTimedOut
                    ? "Timed out"
                    : isFailed
                    ? "Query failed"
                    : outcome.status.toLowerCase()}
                </span>
                {!isUnconfigured && (
                  <button
                    type="button"
                    onClick={() => executeDiscovery(requestId)}
                    className="text-xs font-semibold text-[#0E5A55] underline hover:text-[#0A4743] cursor-pointer"
                  >
                    Retry
                  </button>
                )}
                {isUnconfigured && (
                  <ProvenanceChip kind="unverified" customLabel="Unconfigured" />
                )}
              </div>
            );
          })}
        </div>

        {/* Empty Results State */}
        {eligibleCandidates.length === 0 && (
          <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-10 shadow-sm text-center mb-8">
            <h3 className="font-heading font-bold text-xl text-[#16191C] mb-2">
              No matching offers discovered
            </h3>
            <p className="text-xs text-[#4D534F] max-w-lg mx-auto mb-6 leading-relaxed">
              None of the discovered candidate offers passed all constraints within the target budget of $
              {(brief.budget.amountMinor / 100).toFixed(2)} {brief.budget.currency}. You can loosen constraints or increase your budget.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] bg-[#0E5A55] text-white text-xs font-semibold hover:bg-[#0A4743] transition-colors"
            >
              <span>Refine brief</span>
              <span>&rarr;</span>
            </Link>
          </div>
        )}

        {/* 2-Column Main Evaluation Section (Only if recommendation exists) */}
        {recommended && (
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
                      {recommended.offer.productTitle}
                    </h2>
                    <p className="text-xs text-[#4D534F] mt-1">
                      {recommended.offer.merchantName} &middot; via{" "}
                      {recommended.offer.providerId === "seeded_demo"
                        ? "Demo catalog"
                        : recommended.offer.providerId}{" "}
                      &middot; {recommended.trust.signals[0]?.name || "Verified seller identity"}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <ScoreRing score={recommended.score.displayedScore} />
                    <span className="text-[10px] font-mono text-[#4D534F] mt-1 whitespace-nowrap">
                      {recommended.score.modelVersion} &middot; confidence {recommended.score.confidence.toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="mb-6">
                  <div className="font-heading font-bold text-3xl text-[#16191C] tracking-tight">
                    ${(recommended.offer.totalKnownMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-[#4D534F] mt-0.5">
                    total known cost &middot;{" "}
                    {recommended.offer.shippingStatus === "KNOWN" && (recommended.offer.shippingMinor === 0 || !recommended.offer.shippingMinor)
                      ? "free shipping"
                      : "shipping included"}{" "}
                    &middot; tax unknown
                  </div>
                </div>

                {/* Why This One Box */}
                <div className="bg-[#FAF8F5] rounded-xl p-4 border border-[#E2DDD0] mb-6">
                  <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block mb-1.5">
                    Why this one
                  </span>
                  <p className="text-xs text-[#16191C] leading-relaxed">
                    {evalResult.recommendationRationale}
                  </p>
                </div>

                {/* Score Breakdown Table */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3 text-[10px] uppercase font-mono text-[#4D534F] border-b border-[#E2DDD0] pb-2">
                    <span className="font-bold">Score breakdown</span>
                    <span>weight &times; score = points</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Requirement Fit */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <span className="font-medium text-[#16191C]">Requirement fit</span>
                          <span className="text-[11px] text-[#4D534F] block">Must-haves & preferences</span>
                        </div>
                        <span className="font-mono text-xs text-[#4D534F]">
                          35% &times; {Math.round(recommended.score.components.requirementFit)} ={" "}
                          <strong>{(0.35 * recommended.score.components.requirementFit).toFixed(1)}</strong>
                        </span>
                      </div>
                      <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0E5A55] h-full rounded-full"
                          style={{ width: `${Math.min(100, recommended.score.components.requirementFit)}%` }}
                        />
                      </div>
                    </div>

                    {/* Performance per Dollar */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <span className="font-medium text-[#16191C]">Performance per dollar</span>
                          <span className="text-[11px] text-[#4D534F] block">Category benchmark</span>
                        </div>
                        <span className="font-mono text-xs text-[#4D534F]">
                          25% &times; {Math.round(recommended.score.components.performancePerDollar)} ={" "}
                          <strong>{(0.25 * recommended.score.components.performancePerDollar).toFixed(1)}</strong>
                        </span>
                      </div>
                      <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0E5A55] h-full rounded-full"
                          style={{ width: `${Math.min(100, recommended.score.components.performancePerDollar)}%` }}
                        />
                      </div>
                    </div>

                    {/* Price Attractiveness */}
                    {recommended.score.components.priceAttractiveness !== undefined && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div>
                            <span className="font-medium text-[#16191C]">Price attractiveness</span>
                            <span className="text-[11px] text-[#4D534F] block">Observed market snapshots</span>
                          </div>
                          <span className="font-mono text-xs text-[#4D534F]">
                            15% &times; {Math.round(recommended.score.components.priceAttractiveness)} ={" "}
                            <strong>{(0.15 * recommended.score.components.priceAttractiveness).toFixed(1)}</strong>
                          </span>
                        </div>
                        <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#0E5A55] h-full rounded-full"
                            style={{ width: `${Math.min(100, recommended.score.components.priceAttractiveness)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Seller Confidence */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <span className="font-medium text-[#16191C]">Seller confidence</span>
                          <span className="text-[11px] text-[#4D534F] block">Trust evidence</span>
                        </div>
                        <span className="font-mono text-xs text-[#4D534F]">
                          15% &times; {Math.round(recommended.score.components.sellerConfidence)} ={" "}
                          <strong>{(0.15 * recommended.score.components.sellerConfidence).toFixed(1)}</strong>
                        </span>
                      </div>
                      <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0E5A55] h-full rounded-full"
                          style={{ width: `${Math.min(100, recommended.score.components.sellerConfidence)}%` }}
                        />
                      </div>
                    </div>

                    {/* Ownership Value */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <span className="font-medium text-[#16191C]">Ownership value</span>
                          <span className="text-[11px] text-[#4D534F] block">Warranty & returns</span>
                        </div>
                        <span className="font-mono text-xs text-[#4D534F]">
                          10% &times; {Math.round(recommended.score.components.ownershipValue)} ={" "}
                          <strong>{(0.1 * recommended.score.components.ownershipValue).toFixed(1)}</strong>
                        </span>
                      </div>
                      <div className="w-full bg-[#E2DDD0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#0E5A55] h-full rounded-full"
                          style={{ width: `${Math.min(100, recommended.score.components.ownershipValue)}%` }}
                        />
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
                    onClick={() =>
                      router.push(
                        `/approve?requestId=${requestId}&offerId=${recommended.offer.id}`
                      )
                    }
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[12px] bg-[#0E5A55] text-white text-sm font-semibold hover:bg-[#0A4743] transition-colors shadow-sm cursor-pointer"
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
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-[12px] bg-white border border-[#E2DDD0] text-sm font-semibold text-[#16191C] hover:bg-neutral-50 transition-colors cursor-pointer"
                  >
                    Compare all candidates ({eligibleCandidates.length})
                  </button>
                </div>
                <span className="text-[11px] text-[#4D534F]">
                  No payment call happens until you approve
                </span>
              </div>
            </div>

            {/* Right Column: Price Intelligence & Seller Signals */}
            <div className="lg:col-span-5 space-y-6">
              <PriceIntelligenceCard
                nowMinor={recommended.offer.totalKnownMinor}
                lowMinor={eligibleCandidates.length > 0 ? Math.min(...eligibleCandidates.map((c) => c.offer.totalKnownMinor)) : undefined}
                highMinor={eligibleCandidates.length > 0 ? Math.max(...eligibleCandidates.map((c) => c.offer.totalKnownMinor)) : undefined}
                currency={recommended.offer.currency}
              />
              <SellerSignalsCard
                sellerConfidenceScore={recommended.score.components.sellerConfidence}
                sellerRating={recommended.offer.sellerRating || 4.7}
                ratingCount={recommended.offer.ratingCount || 1000}
                returnDays={recommended.offer.returnWindowDays || 30}
                isIdentityVerified={recommended.trust.signals.every((s) => s.id !== "TR-01")}
              />
            </div>
          </div>
        )}

        {/* Eligible Candidates Table */}
        <div id="eligible-candidates-section">
          <CandidateTable candidates={candidateRows} category={brief.category} />
        </div>

        {/* Excluded Panels (Over budget & Flagged) */}
        <ExcludedPanels
          overBudgetCandidates={overBudgetCandidates}
          flaggedCandidates={flaggedCandidates}
        />
      </main>
    </>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0E5A55] border-t-transparent mb-4" />
          <p className="text-xs text-[#4D534F]">Loading comparison...</p>
        </main>
      }
    >
      <CompareContent />
    </Suspense>
  );
}
