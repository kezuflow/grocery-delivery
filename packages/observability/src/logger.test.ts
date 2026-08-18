import { describe, expect, it } from "vitest";

import { createLogger, type LogEntry } from "./logger.js";

describe("structured logger", () => {
  it("writes structured entries with correlation context", () => {
    const entries: LogEntry[] = [];
    const logger = createLogger({
      service: "api",
      sink: (entry) => entries.push(entry),
      now: () => new Date("2026-08-18T00:00:00.000Z"),
    }).withCorrelationId("request-123");

    logger.info("request.completed", { status: 200 });

    expect(entries).toEqual([
      {
        timestamp: "2026-08-18T00:00:00.000Z",
        level: "info",
        service: "api",
        event: "request.completed",
        correlationId: "request-123",
        fields: { status: 200 },
      },
    ]);
  });
});
