import { describe, expect, it } from "vitest";

import {
  ConfigurationError,
  parseAllowedOrigins,
  parseConfiguredOrigin,
  parseRuntimeEnvironment,
} from "./runtime-environment.js";

describe("runtime environment configuration", () => {
  it("defaults to development and accepts declared environments", () => {
    expect(parseRuntimeEnvironment(undefined)).toBe("development");
    expect(parseRuntimeEnvironment("production")).toBe("production");
  });

  it("rejects unknown environments", () => {
    expect(() => parseRuntimeEnvironment("preview")).toThrow(ConfigurationError);
  });

  it("normalizes a comma-separated origin list", () => {
    expect(
      parseAllowedOrigins("https://customer.example.com, https://admin.example.com", "production"),
    ).toEqual(["https://customer.example.com", "https://admin.example.com"]);
  });

  it("normalizes a single configured origin", () => {
    expect(
      parseConfiguredOrigin("https://api.example.test", "API_PUBLIC_ORIGIN", "production"),
    ).toBe("https://api.example.test");
  });

  it("permits HTTP only for local development", () => {
    expect(parseAllowedOrigins("http://localhost:3000", "development")).toEqual([
      "http://localhost:3000",
    ]);
    expect(() => parseAllowedOrigins("http://example.com", "production")).toThrow(
      ConfigurationError,
    );
  });
});
