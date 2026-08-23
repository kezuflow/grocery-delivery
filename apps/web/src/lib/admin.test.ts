import { describe, expect, it } from "vitest";

import { ApiClientError } from "./api/client";
import { classifyAdminFeedError } from "./admin";

describe("admin feed state classification", () => {
  it("keeps forbidden and unavailable states distinct", () => {
    expect(
      classifyAdminFeedError(new ApiClientError(403, "FORBIDDEN", "reporting permission required")),
    ).toMatchObject({ status: "forbidden", message: "reporting permission required" });
    expect(
      classifyAdminFeedError(new ApiClientError(503, "UNAVAILABLE", "feed unavailable", "corr-1")),
    ).toMatchObject({
      status: "unavailable",
      message: "feed unavailable",
      correlationId: "corr-1",
    });
  });
});
