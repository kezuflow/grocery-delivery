import { apiErrorResponseSchema } from "@carbon/contracts";
import { describe, expect, it } from "vitest";

import { createApiWorker, createConfiguredApi } from "./runtime.js";

describe("API runtime composition", () => {
  it("builds the API with explicit persistent-session and disabled payment defaults", async () => {
    const app = createConfiguredApi({ APP_ENV: "test" });
    const response = await app.request("/api/v1/health", undefined, { APP_ENV: "test" });

    expect(response.status).toBe(200);
  });

  it("enables the deterministic fake payment provider for local development", async () => {
    const app = createConfiguredApi({ APP_ENV: "development", PAYMENT_PROVIDER: "fake" });
    const response = await app.request("/api/v1/payments/methods");

    expect(response.status).toBe(401);
  });

  it("returns a clear service error when Better Auth is selected without a factory", async () => {
    const worker = createApiWorker();
    const response = await worker.fetch?.(
      new Request("https://api.example.test/api/v1/health", {
        headers: { "x-correlation-id": "runtime-config" },
      }),
      { APP_ENV: "production", AUTH_MODE: "better-auth" },
      createExecutionContext(),
    );
    const body = apiErrorResponseSchema.parse(await response?.json());

    expect(response?.status).toBe(503);
    expect(response?.headers.get("x-correlation-id")).toBe("runtime-config");
    expect(body.error.code).toBe("SERVICE_CONFIGURATION_INVALID");
    expect(body.error.message).toContain("no Better Auth runtime factory");
  });
});

function createExecutionContext(): ExecutionContext {
  return {
    passThroughOnException: () => undefined,
    waitUntil: () => undefined,
  } as unknown as ExecutionContext;
}
