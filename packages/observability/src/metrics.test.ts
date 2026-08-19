import { describe, expect, it } from "vitest";

import { createInMemoryMetricsSink } from "./metrics.js";

describe("metrics sink", () => {
  it("collects immutable request metrics", () => {
    const metrics = createInMemoryMetricsSink();
    metrics.sink({
      name: "api.request",
      correlationId: "request-1",
      method: "GET",
      path: "/health",
      status: 200,
      durationMs: 3,
    });

    expect(metrics.metrics).toEqual([
      {
        name: "api.request",
        correlationId: "request-1",
        method: "GET",
        path: "/health",
        status: 200,
        durationMs: 3,
      },
    ]);
  });
});
