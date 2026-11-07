import React from "react";

interface SandboxBannerProps {
  className?: string;
}

export function SandboxBanner({ className = "" }: SandboxBannerProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#FBE6CC] text-[#7A3D00] border border-[#F5D5B0] ${className}`}
      role="status"
      aria-label="Sandbox mode active"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#7A3D00] opacity-80" />
      <span>Sandbox mode &middot; no real money moves</span>
    </div>
  );
}
