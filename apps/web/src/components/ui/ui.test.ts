import { describe, expect, it } from "vitest";

import { buttonClassName } from "./button";
import { cn } from "./cn";
import { formatStatus, getStatusTone } from "./status-pill";
import { getNextTabIndex } from "./tabs";

describe("ui helpers", () => {
  it("joins conditional class values without empty entries", () => {
    expect(cn("text-ink", false, undefined, "bg-paper")).toBe("text-ink bg-paper");
  });

  it("creates readable button variants", () => {
    const classes = buttonClassName({ tone: "secondary", size: "sm" });

    expect(classes).toContain("border-deep");
    expect(classes).toContain("min-h-9");
    expect(classes).toContain("focus-visible:outline-deep");
  });

  it("normalizes known status labels", () => {
    expect(formatStatus("out_for_delivery")).toBe("out for delivery");
    expect(getStatusTone("delivered")).toBe("success");
    expect(getStatusTone("unknown_status")).toBe("neutral");
  });

  it("wraps tab keyboard navigation predictably", () => {
    expect(getNextTabIndex({ currentIndex: 2, key: "ArrowRight", tabCount: 3 })).toBe(0);
    expect(getNextTabIndex({ currentIndex: 0, key: "ArrowLeft", tabCount: 3 })).toBe(2);
    expect(getNextTabIndex({ currentIndex: 1, key: "Home", tabCount: 3 })).toBe(0);
    expect(getNextTabIndex({ currentIndex: 1, key: "End", tabCount: 3 })).toBe(2);
  });
});
