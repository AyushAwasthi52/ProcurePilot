import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns health response with status and db connectivity", async () => {
    const response = await GET();
    const data = await response.json();

    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("db");
    expect(data).toHaveProperty("timestamp");
    expect(["ok", "degraded"]).toContain(data.status);
    expect(["connected", "disconnected"]).toContain(data.db);
    expect([200, 503]).toContain(response.status);
  });
});
