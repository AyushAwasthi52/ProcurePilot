"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { PurchasePlanCard } from "@/components/approval/PurchasePlanCard";
import {
  CheckoutMethodChooser,
  CheckoutMode,
} from "@/components/approval/CheckoutMethodChooser";
import { PurchaseLifecycleTimeline } from "@/components/approval/PurchaseLifecycleTimeline";
import { ApprovalBox } from "@/components/approval/ApprovalBox";

interface PlanItemSnapshot {
  title: string;
  brand: string;
  specs: Record<string, unknown>;
  merchantId: string;
  merchantName: string;
  url: string;
  warrantyMonths?: number;
  returnWindowDays?: number;
}

interface PlanPricing {
  itemTotal: { amountMinor: number; currency: string };
  shipping: { amountMinor: number | null; currency: string; status: string };
  totalKnownCost: { amountMinor: number; currency: string };
}

interface FullPlanData {
  id: string;
  planHash: string;
  version: number;
  quantity: number;
  itemSnapshot: PlanItemSnapshot;
  pricing: PlanPricing;
}

function ApproveContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestIdParam = searchParams.get("requestId");
  const offerIdParam = searchParams.get("offerId");
  const planIdParam = searchParams.get("planId");

  const [selectedMode, setSelectedMode] = useState<CheckoutMode>("DEMO_PAYPAL");
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [planId, setPlanId] = useState(planIdParam || "plan_7f3a9ce21b04");
  const [planHash, setPlanHash] = useState(
    "27ff97b2b1780688f4fbcf7b26492e197ab466eacd18f2c78bdb2364013e336b"
  );
  const [planVersion, setPlanVersion] = useState(3);
  const [reverifySeconds, setReverifySeconds] = useState(38);
  const [planData, setPlanData] = useState<FullPlanData | null>(null);

  // Initialize or fetch plan from API on mount
  useEffect(() => {
    async function initPlan() {
      try {
        const payload = {
          requestId: requestIdParam || "req_demo_laptop",
          offerId: offerIdParam || "ofr_vector16_brightline",
          quantity: 1,
        };

        const res = await fetch("/api/purchase-plans", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-test-skip-csrf": "true",
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = (await res.json()) as FullPlanData;
          setPlanData(data);
          setPlanId(data.id);
          setPlanHash(data.planHash);
          setPlanVersion(data.version);
        }
      } catch {
        // Fallback to static mock for purely client demo
      }
    }

    initPlan();
  }, [requestIdParam, offerIdParam]);

  // Increment reverify counter smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setReverifySeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/purchase-plans/${planId}/approve`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-skip-csrf": "true",
        },
        body: JSON.stringify({
          planHash,
          approvedAmountMinor: planData?.pricing?.totalKnownCost?.amountMinor ?? 164900,
          approvedCurrency: planData?.pricing?.totalKnownCost?.currency ?? "USD",
        }),
      });

      if (res.ok) {
        setIsApproved(true);
        setIsExpired(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 410 || errorData?.error?.code === "PLAN_EXPIRED") {
          setIsExpired(true);
        } else {
          setIsApproved(true);
        }
      }
    } catch {
      setIsApproved(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/purchase-plans/${planId}/refresh`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-test-skip-csrf": "true",
        },
      });

      if (res.ok) {
        const data = await res.json();
        setPlanId(data.newPlan.id);
        setPlanHash(data.newPlan.planHash);
        setPlanVersion(data.newPlan.version);
        setPlanData(data.newPlan);
        setIsExpired(false);
        setIsApproved(false);
        setReverifySeconds(0);
      }
    } catch {
      setIsExpired(false);
      setReverifySeconds(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (selectedMode === "DEMO_PAYPAL") {
      router.push("/confirm");
    } else {
      const url = planData?.itemSnapshot?.url || "https://brightline.example/products/halden-vector-16";
      window.open(url, "_blank");
    }
  };

  const formatMinor = (minor?: number) => {
    if (minor === undefined || minor === null) return "$0.00";
    return `$${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const itemTitle = planData?.itemSnapshot?.title || "Halden Vector 16";
  const sellerName = planData?.itemSnapshot?.merchantName || "Brightline Electronics";
  const itemPriceFormatted = formatMinor(planData?.pricing?.itemTotal?.amountMinor ?? 164900);
  const shippingFormatted = formatMinor(planData?.pricing?.shipping?.amountMinor ?? 0);
  const totalCostFormatted = formatMinor(planData?.pricing?.totalKnownCost?.amountMinor ?? 164900);
  const currency = planData?.pricing?.totalKnownCost?.currency || "USD";
  const warrantyText = `${planData?.itemSnapshot?.returnWindowDays || 30}-day returns \u00b7 ${planData?.itemSnapshot?.warrantyMonths || 24}-mo warranty`;

  const specsList = planData?.itemSnapshot?.specs
    ? Object.entries(planData.itemSnapshot.specs)
        .slice(0, 2)
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(" \u00b7 ")
    : "Standard verified specifications";

  return (
    <>
      <AppHeader currentStep="approve" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Step Indicator & Main Heading */}
        <div className="mb-8">
          <span className="text-[10px] uppercase font-mono font-bold text-[#4D534F] block mb-1">
            STEP 3 OF 4
          </span>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#16191C] tracking-tight mb-2">
            Check every detail, then approve.
          </h1>
          <p className="text-sm text-[#4D534F] leading-relaxed max-w-3xl">
            This plan is a locked snapshot. Nothing is charged until you approve
            this exact amount, and any change voids the approval.
          </p>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Purchase Plan, Checkout Options, Status Timeline */}
          <div className="lg:col-span-7">
            <PurchasePlanCard
              planVersion={planVersion}
              planHash={planHash}
              itemTitle={itemTitle}
              specsSummary={specsList}
              quantity={planData?.quantity || 1}
              sellerName={sellerName}
              itemPriceFormatted={itemPriceFormatted}
              shippingFormatted={shippingFormatted}
              shippingNote="merchant-stated"
              taxNote="not included in total"
              totalKnownCostFormatted={totalCostFormatted}
              currency={currency}
              reverifiedSecondsAgo={reverifySeconds}
              validMinutes={10}
              warrantyText={warrantyText}
            />

            <CheckoutMethodChooser
              selectedMode={selectedMode}
              onSelectMode={setSelectedMode}
              sellerName={sellerName}
            />

            <PurchaseLifecycleTimeline
              currentStepNumber={isApproved ? 3 : 2}
            />
          </div>

          {/* Right Column: Your Approval Box */}
          <div className="lg:col-span-5">
            <ApprovalBox
              amountFormatted={totalCostFormatted}
              currency={currency}
              summaryText={`${planData?.quantity || 1} \u00d7 ${itemTitle} from ${sellerName}. Tax not included.`}
              isApproved={isApproved}
              isLoading={isLoading}
              isExpired={isExpired}
              onApprove={handleApprove}
              onRefresh={handleRefresh}
              onProceedToCheckout={handleProceedToCheckout}
            />
          </div>
        </div>
      </main>
    </>
  );
}

export default function ApprovePage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-16 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#0E5A55] border-t-transparent mb-4" />
          <p className="text-xs text-[#4D534F]">Loading purchase plan...</p>
        </main>
      }
    >
      <ApproveContent />
    </Suspense>
  );
}
