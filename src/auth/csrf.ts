import { ForbiddenError } from "./errors";

export const CSRF_COOKIE_NAME = "procurepilot_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("hex");
}

export function verifyCsrfToken(request: Request): void {
  const method = request.method.toUpperCase();
  // Safe methods do not require CSRF token
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return;
  }

  // Allow test bypass with explicit header in testing environments
  if (
    process.env.NODE_ENV === "test" &&
    request.headers.get("x-test-skip-csrf") === "true"
  ) {
    return;
  }

  const tokenFromHeader = request.headers.get(CSRF_HEADER_NAME);
  if (!tokenFromHeader) {
    throw new ForbiddenError("Missing CSRF token header (X-CSRF-Token)");
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));

  if (!match) {
    // If no cookie present, check if header token is non-empty string in dev
    if (process.env.NODE_ENV === "development" && tokenFromHeader.length >= 16) {
      return;
    }
    throw new ForbiddenError("Missing CSRF cookie");
  }

  const tokenFromCookie = match.substring(CSRF_COOKIE_NAME.length + 1);
  if (tokenFromHeader !== tokenFromCookie) {
    throw new ForbiddenError("CSRF token mismatch");
  }
}

