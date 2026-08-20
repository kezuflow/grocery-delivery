import { describe, expect, it } from "vitest";

import { ConfigurationError } from "./runtime-environment.js";
import { parseApiRuntimeConfiguration } from "./service-providers.js";

describe("API runtime provider configuration", () => {
  it("keeps persistent sessions limited to local environments", () => {
    expect(parseApiRuntimeConfiguration({ APP_ENV: "development" })).toMatchObject({
      authMode: "persistent-session",
      paymentProvider: "disabled",
    });
    expect(() =>
      parseApiRuntimeConfiguration({
        APP_ENV: "production",
        PAYMENT_PROVIDER: "paymongo",
        PAYMONGO_SECRET_KEY: "sk_test_123",
      }),
    ).toThrow("persistent-session authentication is limited");
  });

  it("allows the fake payment provider only outside deployed environments", () => {
    expect(
      parseApiRuntimeConfiguration({ APP_ENV: "development", PAYMENT_PROVIDER: "fake" }),
    ).toMatchObject({ paymentProvider: "fake" });
    expect(() =>
      parseApiRuntimeConfiguration({ APP_ENV: "production", PAYMENT_PROVIDER: "fake" }),
    ).toThrow(ConfigurationError);
    expect(() =>
      parseApiRuntimeConfiguration({
        APP_ENV: "production",
        AUTH_MODE: "better-auth",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "https://api.example.com",
        CORS_ORIGINS: "https://app.example.com",
        PAYMENT_PROVIDER: "disabled",
      }),
    ).toThrow("disabled payment provider is limited");
  });

  it("requires PayMongo credentials and keeps its API origin configurable", () => {
    expect(() =>
      parseApiRuntimeConfiguration({ APP_ENV: "staging", PAYMENT_PROVIDER: "paymongo" }),
    ).toThrow("PAYMONGO_SECRET_KEY is required");
    expect(
      parseApiRuntimeConfiguration({
        APP_ENV: "staging",
        AUTH_MODE: "better-auth",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "https://api.example.com",
        CORS_ORIGINS: "https://app.example.com",
        PAYMENT_PROVIDER: "paymongo",
        PAYMONGO_SECRET_KEY: "sk_test_123",
        PAYMONGO_API_URL: "https://sandbox.paymongo.test",
      }),
    ).toMatchObject({
      paymentProvider: "paymongo",
      paymongoApiUrl: "https://sandbox.paymongo.test",
    });
    expect(() =>
      parseApiRuntimeConfiguration({
        APP_ENV: "staging",
        AUTH_MODE: "better-auth",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "https://api.example.com",
        CORS_ORIGINS: "https://app.example.com",
        PAYMENT_PROVIDER: "paymongo",
        PAYMONGO_SECRET_KEY: "sk_test_123",
        PAYMONGO_API_URL: "http://localhost:8787",
      }),
    ).toThrow("must be an HTTPS origin");
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
      parseApiRuntimeConfiguration({
        APP_ENV: "production",
        AUTH_MODE: "better-auth",
        PAYMENT_PROVIDER: "paymongo",
        PAYMONGO_SECRET_KEY: "sk_test_123",
      }),
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
        PAYMENT_PROVIDER: "paymongo",
        PAYMONGO_SECRET_KEY: "sk_test_123",
      }),
    ).toMatchObject({
      betterAuthUrl: "https://api.example.com",
      betterAuthTrustedOrigins: ["https://app.example.com"],
    });
  });

  it("normalizes server-owned administrator bootstrap emails", () => {
    expect(
      parseApiRuntimeConfiguration({
        APP_ENV: "test",
        AUTH_MODE: "better-auth",
        BETTER_AUTH_SECRET: "x".repeat(32),
        BETTER_AUTH_URL: "https://api.example.com",
        ADMIN_BOOTSTRAP_EMAILS: " Admin@Example.com,ops@example.com ",
      }).adminBootstrapEmails,
    ).toEqual(["admin@example.com", "ops@example.com"]);
  });
});
