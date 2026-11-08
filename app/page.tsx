"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { ProvenanceChip } from "@/components/ui/ProvenanceChip";
import { PurchaseBrief } from "@/src/ai/schemas/brief";
import { ClarificationQuestion } from "@/src/ai/schemas/clarification";
import { getCsrfHeaders } from "@/src/auth/client-csrf";

const SAMPLE_PROMPTS = [
  {
    category: "Laptop",
    label: "💻 Laptop for ML",
    prompt:
      "A laptop for programming and ML experiments, some gaming on the side. Max $1,800 including shipping. Good thermals, upgradeable RAM, and at least a 2-year warranty.",
    region: "US",
    currency: "USD",
  },
  {
    category: "Headphones",
    label: "🎧 ANC Headphones",
    prompt:
      "Wireless noise cancelling headphones for office focus and travel under $350. Great comfort, multipoint bluetooth, and long battery life.",
    region: "US",
    currency: "USD",
  },
  {
    category: "Smartphone",
    label: "📱 Smartphone",
    prompt:
      "A flagship smartphone with outstanding camera and all-day battery life under $1,000. 128GB or more storage.",
    region: "US",
    currency: "USD",
  },
  {
    category: "Monitor",
    label: "🖥️ 4K Monitor",
    prompt:
      "A 27-inch 4K monitor for productivity and design under $600 with USB-C hub connectivity and at least 3-year warranty.",
    region: "US",
    currency: "USD",
  },
  {
    category: "General",
    label: "🪑 Office Equipment",
    prompt:
      "Ergonomic mesh office chair with adjustable lumbar support and 3D armrests under $400.",
    region: "US",
    currency: "USD",
  },
];

interface AssociatedInput {
  prompt: string;
  region: string;
  currency: string;
  quantity: number;
  urgency: string;
}

export default function HomePage() {
  const router = useRouter();

  // Configuration state
  const [prompt, setPrompt] = useState(
    "A laptop for programming and ML experiments, some gaming on the side. Max $1,800 including shipping. Good thermals, upgradeable RAM, and at least a 2-year warranty."
  );
  const [region, setRegion] = useState("US");
  const [currency, setCurrency] = useState("USD");
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState<"low" | "normal" | "urgent">("normal");

  // Associated input of current analysis to ensure strict synchronization
  const [associatedInput, setAssociatedInput] = useState<AssociatedInput | null>(null);

  // Extracted brief state
  const [requestId, setRequestId] = useState<string | null>(null);
  const [brief, setBrief] = useState<PurchaseBrief | null>(null);
  const [clarification, setClarification] = useState<ClarificationQuestion | null>(null);
  const [selectedClarificationOption, setSelectedClarificationOption] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Request sequencing and abort controllers for race-condition prevention
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const latestSequenceRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  const invalidateAnalysis = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    setRequestId(null);
    setBrief(null);
    setClarification(null);
    setSelectedClarificationOption(null);
    setAssociatedInput(null);
    setAnalysisError(null);
    setSubmitError(null);
  };

  // Safe unmount handling
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, []);

  // Analyze prompt to produce checkable brief
  const analyzePrompt = async (
    promptText: string,
    reqRegion = region,
    reqCurrency = currency,
    reqQuantity = quantity,
    reqUrgency = urgency
  ) => {
    if (!promptText || promptText.trim().length < 5) {
      invalidateAnalysis();
      return;
    }

    // Abort previous in-flight analysis
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;
    const currentSeq = ++latestSequenceRef.current;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...csrfHeaders,
        },
        body: JSON.stringify({
          rawPrompt: promptText,
          region: reqRegion,
          currency: reqCurrency,
          quantity: reqQuantity,
          urgency: reqUrgency,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || "Failed to analyze purchase request");
      }

      const data = await res.json();

      // Only apply state if this is still the newest active request
      if (currentSeq === latestSequenceRef.current && isMountedRef.current) {
        setRequestId(data.id);
        setBrief(data.brief);
        setClarification(data.clarificationQuestion);
        setSelectedClarificationOption(null);
        setAssociatedInput({
          prompt: promptText,
          region: reqRegion,
          currency: reqCurrency,
          quantity: reqQuantity,
          urgency: reqUrgency,
        });
        setAnalysisError(null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Ignore intentional cancellation
      }
      if (currentSeq === latestSequenceRef.current && isMountedRef.current) {
        setAnalysisError(err instanceof Error ? err.message : "Failed to analyze prompt");
        setRequestId(null);
        setBrief(null);
        setClarification(null);
        setAssociatedInput(null);
      }
    } finally {
      if (currentSeq === latestSequenceRef.current && isMountedRef.current) {
        setIsAnalyzing(false);
      }
    }
  };

  // Debounced auto-analysis when input changes
  useEffect(() => {
    if (prompt.trim().length < 5) return;

    // Check if current input already matches what was analyzed
    if (
      associatedInput &&
      associatedInput.prompt === prompt &&
      associatedInput.region === region &&
      associatedInput.currency === currency &&
      associatedInput.quantity === quantity &&
      associatedInput.urgency === urgency
    ) {
      return;
    }

    const timer = setTimeout(() => {
      analyzePrompt(prompt, region, currency, quantity, urgency);
    }, 600);

    return () => clearTimeout(timer);
  }, [prompt, region, currency, quantity, urgency]);

  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt);
    invalidateAnalysis();
  };

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    invalidateAnalysis();
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    invalidateAnalysis();
  };

  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    invalidateAnalysis();
  };

  const handleUrgencyChange = (newUrgency: "low" | "normal" | "urgent") => {
    setUrgency(newUrgency);
    invalidateAnalysis();
  };

  const handleSelectSample = (sample: (typeof SAMPLE_PROMPTS)[0]) => {
    invalidateAnalysis();
    setPrompt(sample.prompt);
    setRegion(sample.region);
    setCurrency(sample.currency);
    analyzePrompt(sample.prompt, sample.region, sample.currency, quantity, urgency);
  };

  const handleAnswerClarification = async (optionId: string) => {
    if (!requestId || !clarification) return;
    setSelectedClarificationOption(optionId);

    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/purchase-requests/${requestId}/clarifications`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...csrfHeaders,
        },
        body: JSON.stringify({
          questionId: clarification.id,
          selectedOptionId: optionId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBrief(data.brief);
        setClarification(null);
      }
    } catch (err) {
      console.error("Failed to submit clarification:", err);
    }
  };

  const handlePreferenceWeightChange = (attr: string, newWeight: number) => {
    if (!brief) return;
    const updatedPreferences = brief.preferences.map((p) =>
      p.attribute === attr ? { ...p, weight: newWeight } : p
    );
    const updatedBrief = { ...brief, preferences: updatedPreferences };
    setBrief(updatedBrief);

    if (requestId) {
      getCsrfHeaders().then((csrfHeaders) => {
        fetch(`/api/purchase-requests/${requestId}/brief`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            ...csrfHeaders,
          },
          body: JSON.stringify(updatedBrief),
        }).catch(console.error);
      });
    }
  };

  const handleRemoveMustHave = (attribute: string) => {
    if (!brief) return;
    const updatedMustHave = brief.mustHave.filter((mh) => mh.attribute !== attribute);
    const updatedBrief = { ...brief, mustHave: updatedMustHave };
    setBrief(updatedBrief);

    if (requestId) {
      getCsrfHeaders().then((csrfHeaders) => {
        fetch(`/api/purchase-requests/${requestId}/brief`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            ...csrfHeaders,
          },
          body: JSON.stringify(updatedBrief),
        }).catch(console.error);
      });
    }
  };

  const handleSearch = async () => {
    if (isSubmitting) return; // Prevent duplicate submission
    setSubmitError(null);

    if (!prompt || prompt.trim().length < 5) {
      setSubmitError("Please describe your purchase requirement (minimum 5 characters).");
      return;
    }

    // Cancel any background analysis in progress
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }

    setIsSubmitting(true);
    try {
      let activeReqId: string | null = null;

      // Reuse request ONLY if current inputs match the analyzed request exactly and analysis is complete
      const isMatching =
        requestId &&
        associatedInput &&
        associatedInput.prompt === prompt &&
        associatedInput.region === region &&
        associatedInput.currency === currency &&
        associatedInput.quantity === quantity &&
        associatedInput.urgency === urgency &&
        !isAnalyzing;

      if (isMatching) {
        activeReqId = requestId;
      } else {
        // Create request for the exact current form state
        const csrfHeaders = await getCsrfHeaders();
        const res = await fetch("/api/purchase-requests", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...csrfHeaders,
          },
          body: JSON.stringify({
            rawPrompt: prompt,
            region,
            currency,
            quantity,
            urgency,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || "Failed to create purchase request");
        }

        const data = await res.json();
        activeReqId = data.id;
        setRequestId(data.id);
        setBrief(data.brief);
      }

      if (!activeReqId) {
        throw new Error("Unable to establish purchase request ID");
      }

      // Navigate to compare screen with the verified request ID
      router.push(`/compare?requestId=${activeReqId}`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to proceed to search");
      // NEVER navigate to /compare on failed request creation
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNewRequest = () => {
    invalidateAnalysis();
    setPrompt("");
  };

  const formatPriceMinor = (minor?: number, curr = currency) => {
    if (!minor) return "$0.00";
    return `$${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr}`;
  };

  return (
    <>
      <AppHeader currentStep="brief" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Purchasing Intelligence Eyebrow & Hero Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-bold tracking-widest text-[#4D534F] uppercase font-mono">
              Purchasing Intelligence &middot; Category-Agnostic
            </p>
            <h1 className="text-4xl sm:text-5xl font-heading font-bold tracking-tight text-[#16191C] mt-2 mb-4 leading-tight">
              Tell us what you need.
              <br />
              We show our work.
            </h1>
            <p className="text-base sm:text-lg text-[#4D534F] max-w-2xl leading-relaxed">
              Describe any purchase requirement in plain language. ProcurePilot turns it into
              a checkable brief, compares real verified offers, explains the ranking, and
              never pays without your exact approval.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartNewRequest}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#16191C] bg-white border border-[#E2DDD0] hover:bg-neutral-50 shadow-sm transition-colors self-start md:self-auto cursor-pointer"
          >
            <span>+</span>
            <span>Start new request</span>
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs font-mono font-semibold text-[#4D534F] mr-1 uppercase">
            Try example:
          </span>
          {SAMPLE_PROMPTS.map((sample) => (
            <button
              key={sample.category}
              type="button"
              onClick={() => handleSelectSample(sample)}
              className="px-3 py-1 rounded-full text-xs font-medium bg-white text-[#16191C] border border-[#E2DDD0] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
            >
              {sample.label}
            </button>
          ))}
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
                {isAnalyzing && (
                  <span className="text-[11px] font-mono text-[#0E5A55] animate-pulse">
                    Analyzing intent...
                  </span>
                )}
              </div>

              {/* Editable Request Textarea */}
              <div className="relative mb-4">
                <textarea
                  value={prompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  rows={4}
                  className="w-full bg-[#FAF8F5] rounded-xl p-4 border border-[#E2DDD0] text-[#16191C] text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#0E5A55] resize-none"
                  placeholder="Describe your purchase: laptops, headphones, phones, monitors, appliances, furniture, office equipment..."
                />
              </div>

              {/* Dynamic Interactive Request Config Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[#4D534F] block mb-1">
                    Region
                  </label>
                  <select
                    value={region}
                    onChange={(e) => handleRegionChange(e.target.value)}
                    className="w-full text-xs bg-[#FAF8F5] border border-[#E2DDD0] rounded-lg px-2.5 py-1.5 text-[#16191C] font-medium"
                  >
                    <option value="US">US (United States)</option>
                    <option value="EU">EU (Europe)</option>
                    <option value="UK">UK (United Kingdom)</option>
                    <option value="CA">CA (Canada)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-[#4D534F] block mb-1">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    className="w-full text-xs bg-[#FAF8F5] border border-[#E2DDD0] rounded-lg px-2.5 py-1.5 text-[#16191C] font-medium"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-[#4D534F] block mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full text-xs bg-[#FAF8F5] border border-[#E2DDD0] rounded-lg px-2.5 py-1.5 text-[#16191C] font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-[#4D534F] block mb-1">
                    Urgency
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => handleUrgencyChange(e.target.value as "low" | "normal" | "urgent")}
                    className="w-full text-xs bg-[#FAF8F5] border border-[#E2DDD0] rounded-lg px-2.5 py-1.5 text-[#16191C] font-medium"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Flexible</option>
                  </select>
                </div>
              </div>

              {/* Error messages if any */}
              {analysisError && (
                <div className="bg-[#FFF0F0] border border-[#FFD0D0] text-[#A00000] p-3 rounded-xl text-xs mb-4">
                  {analysisError}
                </div>
              )}
              {submitError && (
                <div className="bg-[#FFF0F0] border border-[#FFD0D0] text-[#A00000] p-3 rounded-xl text-xs mb-4">
                  {submitError}
                </div>
              )}

              {/* Dynamic Category Clarification Card (Appears only if needed) */}
              {clarification && (
                <div className="bg-[#FDF8F0] border border-[#F5D5B0] rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-[#7A3D00] text-sm font-bold">ⓘ</span>
                    <span className="text-xs font-semibold text-[#7A3D00]">
                      One question before we search &middot; {brief?.category || "Clarification"}
                    </span>
                  </div>
                  <p className="text-xs text-[#5C320A] mb-3 leading-relaxed">
                    {clarification.question}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {clarification.options.map((opt) => {
                      const isSelected = selectedClarificationOption === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAnswerClarification(opt.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[#DDEDEA] text-[#0A4743] border border-[#C5DFD9] font-semibold"
                              : "bg-white text-[#4D534F] border border-[#E2DDD0] hover:bg-neutral-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[#E2DDD0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-xs text-[#4D534F]">
                Nothing is searched until you press the button.
              </span>
              <button
                type="button"
                onClick={handleSearch}
                disabled={isSubmitting || !prompt.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[12px] bg-[#0E5A55] text-white text-sm font-semibold hover:bg-[#0A4743] disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
              >
                <span>{isSubmitting ? "Searching..." : "Search sources"}</span>
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
                  Schema v{brief?.schemaVersion || 3} &middot; validated
                </span>
              </div>
              <p className="text-xs text-[#4D534F] mb-6">
                Every field shows where it came from. Edit anything before searching.
              </p>

              {/* Brief Rows */}
              <div className="space-y-4 text-xs">
                {/* Category */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD0]">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
                      Category
                    </span>
                    <span className="text-sm font-medium text-[#16191C]">
                      {brief?.category || (isAnalyzing ? "Analyzing category..." : "Awaiting input")}
                    </span>
                  </div>
                  <ProvenanceChip kind="inferred" />
                </div>

                {/* Budget Cap */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD0]">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
                      Budget Cap
                    </span>
                    <span className="text-sm font-medium text-[#16191C]">
                      {brief ? formatPriceMinor(brief.budget?.amountMinor, brief.budget?.currency) : "$0.00"} &middot;{" "}
                      {brief?.budget?.includesShipping ? "shipping included" : "shipping excluded"}
                    </span>
                  </div>
                  <ProvenanceChip kind="you-said" />
                </div>

                {/* Dynamic Must-Haves */}
                {brief?.mustHave && brief.mustHave.length > 0 && (
                  <div className="pb-3 border-b border-[#E2DDD0]">
                    <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block mb-2">
                      Must Have Constraints
                    </span>
                    <div className="space-y-2">
                      {brief.mustHave.map((mh, idx) => (
                        <div
                          key={mh.attribute + idx}
                          className="flex items-center justify-between bg-[#FAF8F5] p-2.5 rounded-lg border border-[#E2DDD0]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[#16191C]">
                              {mh.label || `${mh.attribute} ${mh.operator} ${String(mh.value)}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMustHave(mh.attribute)}
                              title="Remove constraint"
                              className="text-[11px] text-[#8C928F] hover:text-red-600 transition-colors ml-1 cursor-pointer"
                            >
                              &times;
                            </button>
                          </div>
                          <ProvenanceChip
                            kind={mh.provenance || "you-said"}
                            customLabel={mh.confirmed ? "You said" : "Confirm"}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Use Cases */}
                {brief?.useCases && brief.useCases.length > 0 && (
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD0]">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
                        Use Cases
                      </span>
                      <span className="text-sm font-medium text-[#16191C]">
                        {brief.useCases.join(" \u00b7 ")}
                      </span>
                    </div>
                    <ProvenanceChip kind="you-said" />
                  </div>
                )}

                {/* Dynamic Preference Weights Sliders */}
                {brief?.preferences && brief.preferences.length > 0 && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block">
                        Preference Weights &middot; {brief.category}
                      </span>
                      <span className="text-[10px] font-mono text-[#4D534F]">
                        Total: {brief.preferences.reduce((acc, p) => acc + p.weight, 0)} pts
                      </span>
                    </div>

                    <div className="space-y-3">
                      {brief.preferences.map((pref) => (
                        <div key={pref.attribute}>
                          <div className="flex justify-between text-xs text-[#16191C] mb-1">
                            <span>{pref.label || pref.attribute}</span>
                            <span className="font-mono font-semibold">{pref.weight}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            value={pref.weight}
                            onChange={(e) =>
                              handlePreferenceWeightChange(
                                pref.attribute,
                                parseInt(e.target.value, 10)
                              )
                            }
                            className="w-full accent-[#0E5A55] h-1.5 bg-[#E2DDD0] rounded-full cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                Stable fictional listings across categories so walkthroughs always work. Never
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
                Permitted API. Bounded timeout. Results cached with a freshness
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
            <h3 className="font-heading font-bold text-base mb-2">Evidence first</h3>
            <p className="text-xs text-[#B2B8B5] leading-relaxed">
              Every claim carries its source, timestamp and a label: verified,
              estimated, stale or inferred.
            </p>
          </div>

          <div className="bg-[#16191C] rounded-[18px] p-6 text-white shadow-sm">
            <h3 className="font-heading font-bold text-base mb-2">Total value</h3>
            <p className="text-xs text-[#B2B8B5] leading-relaxed">
              Ranked on fit, shipping, warranty, seller confidence and price
              timing, not the lowest sticker price.
            </p>
          </div>

          <div className="bg-[#16191C] rounded-[18px] p-6 text-white shadow-sm">
            <h3 className="font-heading font-bold text-base mb-2">You hold the pen</h3>
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
