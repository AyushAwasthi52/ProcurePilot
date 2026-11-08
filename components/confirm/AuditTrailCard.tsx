import React from "react";

export interface AuditEventItem {
  time: string;
  description: string;
  badgeText: string;
  badgeKind: "system" | "partial" | "computed" | "verified" | "you" | "server" | "paypal" | "reconciled";
}

const DEFAULT_AUDIT_EVENTS: AuditEventItem[] = [
  {
    time: "18:02:11",
    description: "Brief validated against schema v3",
    badgeText: "System",
    badgeKind: "system",
  },
  {
    time: "18:02:19",
    description: "Search run: 2 sources answered, 1 timed out",
    badgeText: "Partial",
    badgeKind: "partial",
  },
  {
    time: "18:02:20",
    description: "16 offers scored; 3 eligible, 1 over budget, 1 flagged",
    badgeText: "Computed",
    badgeKind: "computed",
  },
  {
    time: "18:04:47",
    description: "Purchase plan v3 locked with price re-verified",
    badgeText: "Verified",
    badgeKind: "verified",
  },
  {
    time: "18:05:30",
    description: "Approval recorded for $1,649.00 USD, bound to plan hash",
    badgeText: "You",
    badgeKind: "you",
  },
  {
    time: "18:05:31",
    description: "PayPal order created with idempotency key",
    badgeText: "Server",
    badgeKind: "server",
  },
  {
    time: "18:06:02",
    description: "Payer approved in PayPal",
    badgeText: "PayPal",
    badgeKind: "paypal",
  },
  {
    time: "18:06:03",
    description: "Capture executed server-side and verified COMPLETED",
    badgeText: "Verified",
    badgeKind: "verified",
  },
  {
    time: "18:06:09",
    description: "Webhook received, signature checked, duplicate ignored",
    badgeText: "Reconciled",
    badgeKind: "reconciled",
  },
];

export interface AuditTrailCardProps {
  events?: AuditEventItem[];
}

export function AuditTrailCard({
  events = DEFAULT_AUDIT_EVENTS,
}: AuditTrailCardProps) {
  const getBadgeClasses = (kind: AuditEventItem["badgeKind"]) => {
    switch (kind) {
      case "partial":
        return "bg-[#FFF4E5] text-[#B45309]";
      case "computed":
      case "verified":
      case "reconciled":
        return "bg-[#DDEDEA] text-[#0A4743] border border-[#C5DFD9]";
      case "you":
      case "paypal":
        return "bg-[#E8F1FC] text-[#1D4ED8]";
      case "system":
      case "server":
      default:
        return "bg-[#FAF8F5] text-[#4D534F] border border-[#E2DDD0]";
    }
  };

  return (
    <div className="bg-white rounded-[18px] border border-[#E2DDD0] p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-[#E2DDD0] mb-4">
        <h2 className="font-heading font-bold text-base text-[#16191C]">
          Audit trail
        </h2>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#EEF3F8] text-[#2B4365] border border-[#DCE5EF]">
          {events.length} events &middot; immutable
        </span>
      </div>

      <div className="space-y-3.5">
        {events.map((evt, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 text-xs leading-relaxed"
          >
            <div className="flex items-baseline gap-3 min-w-0">
              <span className="font-mono text-[#4D534F] text-[11px] shrink-0">
                {evt.time}
              </span>
              <span className="text-[#16191C] font-normal truncate">
                {evt.description}
              </span>
            </div>

            <span
              className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${getBadgeClasses(
                evt.badgeKind
              )}`}
            >
              {evt.badgeText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

