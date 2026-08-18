import { describe, expect, it } from "vitest";

import { apiErrorResponseSchema, healthResponseSchema } from "@carbon/contracts";
import { createApi } from "./app.js";

describe("API worker", () => {
  const app = createApi({
    generateCorrelationId: () => "generated-request",
    now: () => new Date("2026-08-18T00:00:00.000Z"),
    version: "test-version",
    sink: () => undefined,
  });

  it("returns the unversioned infrastructure health check", async () => {
    const response = await app.request("/health", {
      headers: { "x-correlation-id": "health-request" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe("health-request");
    healthResponseSchema.parse(await response.json());
  });

  it("returns the versioned health contract", async () => {
    const response = await app.request(
      "/api/v1/health",
      {
        headers: { "x-correlation-id": "api-request" },
      },
      { APP_ENV: "test", VERSION: "worker-test" },
    );
    const body = healthResponseSchema.parse(await response.json());

    expect(body.data.version).toBe("worker-test");
    expect(body.meta.correlationId).toBe("api-request");
  });

  it("returns a consistent error envelope for unknown routes", async () => {
    const response = await app.request("/api/v1/unknown", {
      headers: { "x-correlation-id": "missing-route" },
    });
    const body = apiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.meta.correlationId).toBe("missing-route");
  });

  it("rejects a non-HTTPS production CORS origin during request setup", async () => {
    const response = await app.request(
      "/api/v1/health",
      {
        headers: { origin: "http://example.com" },
      },
      { APP_ENV: "production", CORS_ORIGINS: "http://example.com" },
    );

    expect(response.status).toBe(500);
  });
});
