import { describe, expect, it } from "vitest";

import { normalizeSubscriptionReturnTo, subscriptionReturnHref } from "./subscription-onboarding";

describe("subscription onboarding navigation", () => {
  it("keeps local return paths and rejects external destinations", () => {
    expect(normalizeSubscriptionReturnTo("/shop?search=greens")).toBe("/shop?search=greens");
    expect(normalizeSubscriptionReturnTo("https://example.com")).toBe("/shop");
    expect(normalizeSubscriptionReturnTo("//example.com")).toBe("/shop");
    expect(normalizeSubscriptionReturnTo(undefined)).toBe("/shop");
  });

  it("encodes the return path in the onboarding link", () => {
    expect(subscriptionReturnHref("/shop?search=greens")).toBe(
      "/account/subscribe?returnTo=%2Fshop%3Fsearch%3Dgreens",
    );
  });
});
