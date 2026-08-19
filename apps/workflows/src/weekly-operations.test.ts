import { describe, expect, it } from "vitest";

import { createWeeklyOperationsDefinition, runWeeklyOperations } from "./weekly-operations.js";

describe("weekly operations workflow", () => {
  it("defines ordered operational steps with explicit retry boundaries", () => {
    const definition = createWeeklyOperationsDefinition({
      cycleId: "cycle-2026-08-29",
      correlationId: "request-1",
    });

    expect(definition.steps.map((step) => step.name)).toEqual([
      "procurement-demand",
      "procurement-exceptions",
      "packing",
      "dispatch",
      "delivery-summary",
    ]);
    expect(definition.steps[0]?.retry).toEqual({
      limit: 3,
      backoff: "exponential",
      delaySeconds: 30,
    });
  });

  it("runs each step in order and preserves the workflow correlation", async () => {
    const definition = createWeeklyOperationsDefinition({
      cycleId: "cycle-2026-08-29",
      correlationId: "request-1",
    });
    const calls: string[] = [];

    await runWeeklyOperations(definition, (step, input) => {
      calls.push(`${step.name}:${input.correlationId}`);
      return Promise.resolve();
    });

    expect(calls).toEqual([
      "procurement-demand:request-1",
      "procurement-exceptions:request-1",
      "packing:request-1",
      "dispatch:request-1",
      "delivery-summary:request-1",
    ]);
  });
});
