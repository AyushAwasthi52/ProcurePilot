import React from "react";

export type ProvenanceKind =
  | "you-said"
  | "inferred"
  | "confirm"
  | "provider-reported"
  | "verified"
  | "computed"
  | "estimated"
  | "unknown"
  | "unverified"
  | "stale"
  | "demo-data"
  | "healthy"
  | "partial"
  | "reconciled";

interface ChipStyle {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const STYLES: Record<ProvenanceKind, ChipStyle> = {
  "you-said": {
    label: "You said",
    bgClass: "bg-[#DDEDEA]",
    textClass: "text-[#0A4743]",
    borderClass: "border-[#C5DFD9]",
  },
  inferred: {
    label: "Inferred",
    bgClass: "bg-[#E4E9F7]",
    textClass: "text-[#26397A]",
    borderClass: "border-[#D0DAF3]",
  },
  confirm: {
    label: "Confirm",
    bgClass: "bg-[#FBE6CC]",
    textClass: "text-[#7A3D00]",
    borderClass: "border-[#F5D5B0]",
  },
  "provider-reported": {
    label: "Provider-reported",
    bgClass: "bg-[#E4E9F7]",
    textClass: "text-[#26397A]",
    borderClass: "border-[#D0DAF3]",
  },
  verified: {
    label: "Verified",
    bgClass: "bg-[#DDEDEA]",
    textClass: "text-[#0A4743]",
    borderClass: "border-[#C5DFD9]",
  },
  computed: {
    label: "Computed",
    bgClass: "bg-[#DDEDEA]",
    textClass: "text-[#0A4743]",
    borderClass: "border-[#C5DFD9]",
  },
  estimated: {
    label: "Estimated",
    bgClass: "bg-[#FBE6CC]",
    textClass: "text-[#7A3D00]",
    borderClass: "border-[#F5D5B0]",
  },
  unknown: {
    label: "Unknown",
    bgClass: "bg-[#FBE6CC]",
    textClass: "text-[#7A3D00]",
    borderClass: "border-[#F5D5B0]",
  },
  unverified: {
    label: "Unverified",
    bgClass: "bg-[#FBE6CC]",
    textClass: "text-[#7A3D00]",
    borderClass: "border-[#F5D5B0]",
  },
  stale: {
    label: "Stale",
    bgClass: "bg-[#FBE6CC]",
    textClass: "text-[#7A3D00]",
    borderClass: "border-[#F5D5B0]",
  },
  "demo-data": {
    label: "Demo data",
    bgClass: "bg-[#FBE6CC]",
    textClass: "text-[#7A3D00]",
    borderClass: "border-[#F5D5B0]",
  },
  healthy: {
    label: "Healthy",
    bgClass: "bg-[#DDEDEA]",
    textClass: "text-[#0A4743]",
    borderClass: "border-[#C5DFD9]",
  },
  partial: {
    label: "Partial",
    bgClass: "bg-[#FBE6CC]",
    textClass: "text-[#7A3D00]",
    borderClass: "border-[#F5D5B0]",
  },
  reconciled: {
    label: "Reconciled",
    bgClass: "bg-[#DDEDEA]",
    textClass: "text-[#0A4743]",
    borderClass: "border-[#C5DFD9]",
  },
};

interface ProvenanceChipProps {
  kind: ProvenanceKind;
  customLabel?: string;
  className?: string;
}

export function ProvenanceChip({
  kind,
  customLabel,
  className = "",
}: ProvenanceChipProps) {
  const style = STYLES[kind] ?? STYLES.inferred;
  const label = customLabel ?? style.label;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border leading-none whitespace-nowrap ${style.bgClass} ${style.textClass} ${style.borderClass} ${className}`}
    >
      {label}
    </span>
  );
}

