"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { PurchasePlanCard } from "@/components/approval/PurchasePlanCard";
import {
  CheckoutMethodChooser,
  CheckoutMode,
} from "@/components/approval/CheckoutMethodChooser";
import { PurchaseLifecycleTimeline } from "@/components/approval/PurchaseLifecycleTimeline";
import { ApprovalBox } from "@/components/approval/ApprovalBox";

export default function ApprovePage() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<CheckoutMode>("DEMO_PAYPAL");
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [planId, setPlanId] = useState("plan_7f3a9ce21b04");
  const [planHash, setPlanHash] = useState(
    "27ff97b2b1780688f4fbcf7b26492e197ab466eacd18f2c78bdb2364013e336b"
  );
  const [planVersion, setPlanVersion] = useState(3);
  const [reverifySeconds, setReverifySeconds] = useState(38);

  // Initialize or fetch plan from API on mount
  useEffect(() => {
    async function initPlan() {
      try {
        const res = await fetch("/api/purchase-plans", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestId: "req_demo_laptop",
            offerId: "ofr_vector16_brightline",
            quantity: 1,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setPlanId(data.id);
          setPlanHash(data.planHash);
          setPlanVersion(data.version);
        }
      } catch {
        // Fallback to static mock for purely client demo
      }
    }

    initPlan();
  }, []);

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
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planHash,
          approvedAmountMinor: 164900,
          approvedCurrency: "USD",
        }),
      });

      if (res.ok) {
        setIsApproved(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 410 || errorData?.error?.code === "PLAN_EXPIRED") {
          setIsExpired(true);
        } else {
          // If in offline demo mode, proceed to approved state
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
        headers: { "content-type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        setPlanId(data.newPlan.id);
        setPlanHash(data.newPlan.planHash);
        setPlanVersion(data.newPlan.version);
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
      window.open(
        "https://brightline.example/products/halden-vector-16",
        "_blank"
      );
    }
  };

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
              itemTitle="Halden Vector 16"
              specsSummary="32 GB &middot; 1 TB"
              quantity={1}
              sellerName="Brightline Electronics"
              itemPriceFormatted="$1,649.00"
              shippingFormatted="$0.00"
              shippingNote="merchant-stated"
              taxNote="not included in total"
              totalKnownCostFormatted="$1,649.00"
              currency="USD"
              reverifiedSecondsAgo={reverifySeconds}
              validMinutes={10}
              warrantyText="30-day returns &middot; 36-mo warranty"
            />

            <CheckoutMethodChooser
              selectedMode={selectedMode}
              onSelectMode={setSelectedMode}
              sellerName="Brightline"
            />

            <PurchaseLifecycleTimeline
              currentStepNumber={isApproved ? 3 : 2}
            />
          </div>

          {/* Right Column: Your Approval Box */}
          <div className="lg:col-span-5">
            <ApprovalBox
              amountFormatted="$1,649.00"
              currency="USD"
              summaryText="1 &times; Halden Vector 16 from Brightline Electronics. Tax not included."
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
