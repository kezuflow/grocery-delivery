import { describe, expect, it } from "vitest";

import { apiErrorResponseSchema, healthResponseSchema } from "./system.js";

describe("system contracts", () => {
  it("accepts the versioned health response envelope", () => {
    expect(
      healthResponseSchema.parse({
        data: {
          status: "ok",
          service: "api",
          environment: "test",
          version: "0.0.0-test",
          timestamp: "2026-08-18T00:00:00.000Z",
        },
        meta: { correlationId: "request-123" },
      }),
    ).toBeDefined();
  });

  it("rejects malformed API errors", () => {
    expect(() => apiErrorResponseSchema.parse({ error: { code: "NOT_FOUND" } })).toThrow();
  });
});
