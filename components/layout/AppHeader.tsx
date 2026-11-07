import React from "react";
import Link from "next/link";
import { StepNav, StepId } from "./StepNav";
import { SandboxBanner } from "./SandboxBanner";

interface AppHeaderProps {
  currentStep?: StepId;
  className?: string;
}

export function AppHeader({ currentStep = "brief", className = "" }: AppHeaderProps) {
  return (
    <header className={`w-full bg-[#F5F2EA] border-b border-[#E2DDD0]/80 sticky top-0 z-30 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group focus:outline-none">
          <div className="w-8 h-8 rounded-lg bg-[#0E5A55] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 2L18 16H2L10 2Z"
                fill="currentColor"
              />
              <path
                d="M10 7L14.5 15H5.5L10 7Z"
                fill="#0E5A55"
              />
            </svg>
          </div>
          <span className="font-heading font-bold text-lg tracking-tight text-[#16191C]">
            ProcurePilot
          </span>
        </Link>

        {/* Step Navigation */}
        <div className="hidden md:flex items-center justify-center">
          <StepNav currentStep={currentStep} />
        </div>

        {/* Status / Sandbox Banner */}
        <div className="flex items-center">
          <SandboxBanner />
        </div>
      </div>
    </header>
  );
}
