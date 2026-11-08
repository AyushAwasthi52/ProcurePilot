import { PaymentStatus } from "./types";

const ALLOWED_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  CREATED: ["PAYER_ACTION_REQUIRED", "CANCELLED", "EXPIRED"] as const,
  PAYER_ACTION_REQUIRED: ["CAPTURE_PENDING", "CANCELLED", "EXPIRED"] as const,
  CAPTURE_PENDING: [
    "COMPLETED",
    "DECLINED",
    "FAILED",
    "REQUIRES_RECONCILIATION",
  ] as const,
  COMPLETED: ["REFUNDED"] as const,
  REQUIRES_RECONCILIATION: ["COMPLETED", "FAILED"] as const,
  CANCELLED: [] as const,
  DECLINED: [] as const,
  FAILED: [] as const,
  EXPIRED: [] as const,
  REFUNDED: [] as const,
};

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly from: PaymentStatus,
    public readonly to: PaymentStatus
  ) {
    super(`Illegal payment state transition from ${from} to ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true; // Idempotent no-op
  const allowed = ALLOWED_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function assertValidTransition(
  from: PaymentStatus,
  to: PaymentStatus
): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

export function isTerminalState(status: PaymentStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[status] || [];
  return allowed.length === 0;
}

