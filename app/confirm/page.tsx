"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { ConfirmedHero } from "@/components/confirm/ConfirmedHero";
import { ReceiptCard } from "@/components/confirm/ReceiptCard";
import { AuditTrailCard } from "@/components/confirm/AuditTrailCard";
import { DemoDisclosuresCard } from "@/components/confirm/DemoDisclosuresCard";

export default function ConfirmPage() {
  const router = useRouter();

  return (
    <>
      <AppHeader currentStep="confirm" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Deep Teal Payment Verified Hero Banner */}
        <ConfirmedHero
          amountFormatted="$1,649.00"
          currency="USD"
        />

        {/* 2-Column Layout: Receipt and Immutable Audit Trail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Receipt Card */}
          <div className="lg:col-span-6">
            <ReceiptCard
              itemTitle="Halden Vector 16"
              quantity={1}
              merchantName="ProcurePilot Demo Store (sandbox)"
              planVersion={3}
              planHash="plan_7f3a9ce21b"
              paypalOrderId="[ORDER ID from PayPal]"
              captureStatus="COMPLETED"
              taxStatus="Not included"
              onStartAnother={() => router.push("/")}
              onBackToComparison={() => router.push("/compare")}
            />
          </div>

          {/* Right Column: Audit Trail */}
          <div className="lg:col-span-6">
            <AuditTrailCard />
          </div>
        </div>

        {/* Demo Disclosures Card */}
        <DemoDisclosuresCard />
      </main>
    </>
  );
}

