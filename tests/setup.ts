import { vi } from "vitest";

// Mock the db client in unit tests so tests are fast, isolated, and silent
vi.mock("@/src/db/client", () => {
  return {
    db: {
      $queryRaw: vi.fn().mockRejectedValue(new Error("DB offline")),
      purchaseRequest: {
        create: vi.fn().mockRejectedValue(new Error("DB offline")),
        findUnique: vi.fn().mockRejectedValue(new Error("DB offline")),
      },
      auditEvent: {
        create: vi.fn().mockRejectedValue(new Error("DB offline")),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
  };
});
