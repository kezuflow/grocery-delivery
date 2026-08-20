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
      {
        APP_ENV: "production",
        AUTH_MODE: "better-auth",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "https://api.example.test",
        CORS_ORIGINS: "https://app.example.test",
      },
      createExecutionContext(),
    );
    const body = apiErrorResponseSchema.parse(await response?.json());

    expect(response?.status).toBe(503);
    expect(response?.headers.get("x-correlation-id")).toBe("runtime-config");
    expect(body.error.code).toBe("SERVICE_CONFIGURATION_INVALID");
    expect(body.error.message).toContain("requires a DB binding");
  });

  it("composes Better Auth through an injected runtime factory", async () => {
    const app = createConfiguredApi(
      {
        APP_ENV: "test",
        AUTH_MODE: "better-auth",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "https://api.example.test",
        CORS_ORIGINS: "https://app.example.test",
      },
      {
        createBetterAuthApi: () => ({
          getSession: () => Promise.resolve(null),
          handler: () => Promise.resolve(new Response("auth-ok", { status: 202 })),
        }),
      },
    );

    const response = await app.request("/api/auth/ok");

    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe("auth-ok");
  });

  it("requires deployed Better Auth to provide identity email delivery", async () => {
    const worker = createApiWorker({
      createBetterAuthApi: () => ({ getSession: () => Promise.resolve(null) }),
    });
    const response = await worker.fetch?.(
      new Request("https://api.example.test/api/v1/health", {
        headers: { "x-correlation-id": "email-config" },
      }),
      {
        APP_ENV: "production",
        AUTH_MODE: "better-auth",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "https://api.example.test",
        CORS_ORIGINS: "https://app.example.test",
        DB: {} as never,
      },
      createExecutionContext(),
    );
    const body = apiErrorResponseSchema.parse(await response?.json());

    expect(response?.status).toBe(503);
    expect(body.error.message).toContain("identity email sender");
  });
});

function createExecutionContext(): ExecutionContext {
  return {
    passThroughOnException: () => undefined,
    waitUntil: () => undefined,
  } as unknown as ExecutionContext;
}
