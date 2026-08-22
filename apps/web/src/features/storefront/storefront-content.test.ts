import { describe, expect, it } from "vitest";

import { getSessionErrorMessage } from "./storefront-content";

describe("storefront session notices", () => {
  it("renders a structured API error as text instead of a React child", () => {
    expect(getSessionErrorMessage({ code: "UNAUTHENTICATED", message: "sign in required" })).toBe(
      "sign in required",
    );
  });

  it("keeps unknown failures renderable", () => {
    expect(getSessionErrorMessage({ code: "UNKNOWN" })).toBe(
      "We could not verify your session. Please try again shortly.",
    );
  });
});
