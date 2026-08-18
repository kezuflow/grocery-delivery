import { describe, expect, it } from "vitest";

import { isValidCorrelationId, resolveCorrelationId } from "./correlation-id.js";

describe("correlation IDs", () => {
  it("accepts bounded transport-safe identifiers", () => {
    expect(isValidCorrelationId("req_01:abc-123")).toBe(true);
    expect(isValidCorrelationId("contains a space")).toBe(false);
  });

  it("preserves valid incoming IDs and replaces invalid values", () => {
    expect(resolveCorrelationId("request-123", () => "generated")).toBe("request-123");
    expect(resolveCorrelationId("not valid", () => "generated")).toBe("generated");
  });
});
