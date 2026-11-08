import { NextRequest, NextResponse } from "next/server";

// In-memory sliding window rate limiter
interface RateLimitBucket {
  tokens: number;
  lastRefillMs: number;
}

const rateLimitMap = new Map<string, RateLimitBucket>();
const MAX_TOKENS = 120; // 120 requests per minute
const REFILL_RATE_PER_MS = MAX_TOKENS / 60000; // 2 per second

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let bucket = rateLimitMap.get(ip);

  if (!bucket) {
    bucket = { tokens: MAX_TOKENS - 1, lastRefillMs: now };
    rateLimitMap.set(ip, bucket);
    return true;
  }

  // Refill tokens
  const elapsed = now - bucket.lastRefillMs;
  bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + elapsed * REFILL_RATE_PER_MS);
  bucket.lastRefillMs = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
}

// Clean old rate limit entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of rateLimitMap.entries()) {
      if (now - bucket.lastRefillMs > 300000) {
        rateLimitMap.delete(ip);
      }
    }
  }, 300000);
}

export function middleware(req: NextRequest) {
  const requestId =
    req.headers.get("x-request-id") ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Only apply rate limiting to /api/* routes
  if (req.nextUrl.pathname.startsWith("/api")) {
    // Skip rate limiting strictly in isolated test runs
    const isTest =
      process.env.NODE_ENV === "test" &&
      req.headers.get("x-test-skip-csrf") === "true";
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";

    if (!isTest && !checkRateLimit(ip)) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please slow down.",
            retryable: true,
            requestId,
          },
        },
        {
          status: 429,
          headers: {
            "x-request-id": requestId,
            "retry-after": "5",
          },
        }
      );
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};

