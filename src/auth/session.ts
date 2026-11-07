import { NotFoundError, UnauthenticatedError } from "./errors";

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
}

export const SESSION_COOKIE_NAME = "procurepilot_session";

const DEFAULT_AUTH_SECRET =
  process.env.AUTH_SECRET || "procurepilot-development-secret-change-in-production-min32chars";

// In-memory / development demo buyer
export const DEMO_USER: SessionUser = {
  id: "usr_demo_buyer",
  email: "buyer@procurepilot.demo",
  name: "Demo Buyer",
};

/**
 * Creates an HMAC-SHA256 signed session token
 */
export async function createSessionToken(
  user: SessionUser,
  secret = DEFAULT_AUTH_SECRET
): Promise<string> {
  const payload = JSON.stringify({
    ...user,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
  });

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  const b64Payload = Buffer.from(payload).toString("base64url");
  const b64Sig = Buffer.from(signature).toString("base64url");

  return `${b64Payload}.${b64Sig}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token
 */
export async function verifySessionToken(
  token: string,
  secret = DEFAULT_AUTH_SECRET
): Promise<SessionUser | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [b64Payload, b64Sig] = parts;
    const payloadStr = Buffer.from(b64Payload, "base64url").toString("utf-8");
    const signature = Buffer.from(b64Sig, "base64url");

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(payloadStr)
    );

    if (!isValid) return null;

    const data = JSON.parse(payloadStr);
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts session from Next.js request cookies or headers.
 * In development, if no cookie is present, falls back to DEMO_USER for interactive convenience.
 */
export async function getSession(request: Request): Promise<SessionUser | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (match) {
    const token = match.substring(SESSION_COOKIE_NAME.length + 1);
    const user = await verifySessionToken(token);
    if (user) return user;
  }

  // Check explicit authorization bearer header for testing/API calls
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = await verifySessionToken(token);
    if (user) return user;
  }

  // Development convenience: default to DEMO_USER unless explicitly testing unauthenticated
  const disableDevFallback = request.headers.get("x-test-no-auth") === "true";
  if (process.env.NODE_ENV !== "production" && !disableDevFallback) {
    return DEMO_USER;
  }

  return null;
}

export async function requireSession(request: Request): Promise<SessionUser> {
  const session = await getSession(request);
  if (!session) {
    throw new UnauthenticatedError();
  }
  return session;
}

/**
 * Enforces ownership. Throws NotFoundError (404) on mismatch to prevent existence leaks.
 */
export function assertOwnership(
  currentUserId: string,
  resourceOwnerId: string,
  resourceName = "Resource"
): void {
  if (currentUserId !== resourceOwnerId) {
    throw new NotFoundError(resourceName);
  }
}
