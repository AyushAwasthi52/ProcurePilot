import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "PLAN_HASH_MISMATCH"
  | "PLAN_EXPIRED"
  | "APPROVAL_REQUIRED"
  | "OFFER_CHANGED"
  | "CAPABILITY_UNSUPPORTED"
  | "IDEMPOTENCY_CONFLICT"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "PAYMENT_STATE_UNKNOWN"
  | "INTERNAL";

export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode: number,
    public readonly retryable: boolean = false,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = "Resource") {
    super("NOT_FOUND", `${resource} not found`, 404, false);
  }
}

export class UnauthenticatedError extends ApiError {
  constructor(message = "Authentication required") {
    super("UNAUTHENTICATED", message, 401, false);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Access denied") {
    super("FORBIDDEN", message, 403, false);
  }
}

export class ValidationFailedError extends ApiError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_FAILED", message, 400, false, details);
  }
}

export class PlanExpiredError extends ApiError {
  constructor(message = "Purchase plan has expired. Please refresh the plan.") {
    super("PLAN_EXPIRED", message, 410, true);
  }
}

export class PlanHashMismatchError extends ApiError {
  constructor(message = "Approval hash does not match current plan hash.") {
    super("PLAN_HASH_MISMATCH", message, 409, false);
  }
}

export class OfferChangedError extends ApiError {
  constructor(message = "Offer price or availability has changed.") {
    super("OFFER_CHANGED", message, 409, true);
  }
}

export class DatabaseUnavailableError extends ApiError {
  constructor(
    message = "Database service is temporarily unavailable",
    details?: unknown
  ) {
    super("INTERNAL", message, 503, true, details);
    this.name = "DatabaseUnavailableError";
  }
}

export function createErrorResponse(
  error: unknown,
  requestId: string
): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          requestId,
          details: error.details,
        },
      },
      {
        status: error.statusCode,
        headers: { "x-request-id": requestId },
      }
    );
  }

  // Generic internal server error (never leak raw stack traces)
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL",
        message: "An internal server error occurred",
        retryable: false,
        requestId,
      },
    },
    {
      status: 500,
      headers: { "x-request-id": requestId },
    }
  );
}

