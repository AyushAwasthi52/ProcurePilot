import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "./csrf";

export async function getCsrfHeaders(): Promise<Record<string, string>> {
  if (typeof document === "undefined") {
    return {};
  }

  // 1. Try reading cookie
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));

  let token = match ? match.substring(CSRF_COOKIE_NAME.length + 1) : null;

  // 2. If cookie not present or empty, fetch from /api/csrf
  if (!token) {
    try {
      const res = await fetch("/api/csrf", { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        token = data.csrfToken;
      }
    } catch {
      // Ignore network errors in offline/dev
    }
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers[CSRF_HEADER_NAME] = token;
  }
  return headers;
}

