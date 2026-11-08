import { describe, it, expect } from "vitest";
import {
  canTransition,
  assertValidTransition,
  isTerminalState,
  InvalidStateTransitionError,
} from "@/src/payments/state-machine";

describe("Payment State Machine (Section 9.3)", () => {
  it("permits standard forward payment lifecycle transitions", () => {
    // 1. Order created -> Waiting for payer
    expect(canTransition("CREATED", "PAYER_ACTION_REQUIRED")).toBe(true);

    // 2. Payer acted -> Capture pending
    expect(canTransition("PAYER_ACTION_REQUIRED", "CAPTURE_PENDING")).toBe(true);

    // 3. Capture pending -> Completed
    expect(canTransition("CAPTURE_PENDING", "COMPLETED")).toBe(true);

    // 4. Completed -> Refunded
    expect(canTransition("COMPLETED", "REFUNDED")).toBe(true);
  });

  it("permits transitions to failure and reconciliation states", () => {
    expect(canTransition("CAPTURE_PENDING", "DECLINED")).toBe(true);
    expect(canTransition("CAPTURE_PENDING", "FAILED")).toBe(true);
    expect(canTransition("CAPTURE_PENDING", "REQUIRES_RECONCILIATION")).toBe(true);
    expect(canTransition("REQUIRES_RECONCILIATION", "COMPLETED")).toBe(true);
    expect(canTransition("CREATED", "CANCELLED")).toBe(true);
    expect(canTransition("CREATED", "EXPIRED")).toBe(true);
  });

  it("rejects illegal transitions with InvalidStateTransitionError", () => {
    // Cannot skip from CREATED directly to COMPLETED without capture
    expect(canTransition("CREATED", "COMPLETED")).toBe(false);
    expect(() => assertValidTransition("CREATED", "COMPLETED")).toThrow(
      InvalidStateTransitionError
    );

    // Cannot jump backwards from COMPLETED to CREATED
    expect(canTransition("COMPLETED", "CREATED")).toBe(false);
    expect(() => assertValidTransition("COMPLETED", "CREATED")).toThrow(
      InvalidStateTransitionError
    );

    // Cannot transition out of terminal state
    expect(canTransition("DECLINED", "COMPLETED")).toBe(false);
    expect(canTransition("FAILED", "COMPLETED")).toBe(false);
  });

  it("correctly identifies terminal states", () => {
    expect(isTerminalState("COMPLETED")).toBe(false); // Can be REFUNDED
    expect(isTerminalState("REFUNDED")).toBe(true);
    expect(isTerminalState("DECLINED")).toBe(true);
    expect(isTerminalState("FAILED")).toBe(true);
    expect(isTerminalState("CANCELLED")).toBe(true);
    expect(isTerminalState("EXPIRED")).toBe(true);
    expect(isTerminalState("CREATED")).toBe(false);
  });
});

