import { describe, expect, it } from "vitest";

import { ConfigurationError } from "./runtime-environment.js";
import { parseApiRuntimeConfiguration } from "./service-providers.js";

describe("API runtime provider configuration", () => {
  it("uses conservative defaults", () => {
    expect(parseApiRuntimeConfiguration({ APP_ENV: "production" })).toEqual({
      environment: "production",
      authMode: "persistent-session",
      paymentProvider: "disabled",
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
});
