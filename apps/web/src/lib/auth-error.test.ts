import { describe, expect, it } from "vitest";

import { getAuthErrorMessage } from "./auth-error";

describe("getAuthErrorMessage", () => {
  it("normalizes Better Auth error envelopes", () => {
    expect(
      getAuthErrorMessage(
        { error: { code: "USER_NOT_FOUND", message: "User not found" } },
        "Authentication failed.",
      ),
    ).toBe("User not found");
  });

  it("falls back for malformed responses", () => {
    expect(getAuthErrorMessage({ error: { code: "UNKNOWN" } }, "Authentication failed.")).toBe(
      "Authentication failed.",
    );
  });
});
