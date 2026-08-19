import { describe, expect, it } from "vitest";

import { ConfigurationError } from "./runtime-environment.js";
import { parseApiRuntimeConfiguration } from "./service-providers.js";

describe("API runtime provider configuration", () => {
  it("uses conservative defaults", () => {
    expect(parseApiRuntimeConfiguration({ APP_ENV: "production" })).toEqual({
      environment: "production",
      authMode: "persistent-session",
      paymentProvider: "disabled",
      betterAuthSecret: null,
      betterAuthUrl: null,
      betterAuthTrustedOrigins: [],
    });
  });

  it("allows the fake payment provider only outside deployed environments", () => {
    expect(
      parseApiRuntimeConfiguration({ APP_ENV: "development", PAYMENT_PROVIDER: "fake" }),
    ).toMatchObject({ paymentProvider: "fake" });
    expect(() =>
      parseApiRuntimeConfiguration({ APP_ENV: "production", PAYMENT_PROVIDER: "fake" }),
    ).toThrow(ConfigurationError);
  });

  it("rejects unknown integration selections", () => {
    expect(() => parseApiRuntimeConfiguration({ AUTH_MODE: "legacy" })).toThrow(
      "AUTH_MODE must be one of",
    );
    expect(() => parseApiRuntimeConfiguration({ PAYMENT_PROVIDER: "unknown" })).toThrow(
      "PAYMENT_PROVIDER must be one of",
    );
  });

  it("requires a strong secret and HTTPS origin for Better Auth deployments", () => {
    expect(() =>
      parseApiRuntimeConfiguration({ APP_ENV: "production", AUTH_MODE: "better-auth" }),
    ).toThrow("BETTER_AUTH_SECRET is required");
    expect(() =>
      parseApiRuntimeConfiguration({
        APP_ENV: "production",
        AUTH_MODE: "better-auth",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "http://auth.example.com",
      }),
    ).toThrow("must use HTTPS");
    expect(
      parseApiRuntimeConfiguration({
        APP_ENV: "production",
        AUTH_MODE: "better-auth",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "https://api.example.com",
        CORS_ORIGINS: "https://app.example.com",
      }),
    ).toMatchObject({
      betterAuthUrl: "https://api.example.com",
      betterAuthTrustedOrigins: ["https://app.example.com"],
    });
  });
});
