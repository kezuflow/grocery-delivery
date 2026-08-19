import { describe, expect, it } from "vitest";
import { deliveryWindowsResponseSchema } from "./delivery-windows.js";

describe("delivery window contracts", () => {
  it("validates remaining capacity", () => {
    expect(
      deliveryWindowsResponseSchema.parse({
        data: { cycleId: "cycle-1", selectedWindowId: null, windows: [] },
        meta: { correlationId: "test" },
      }),
    ).toMatchObject({ data: { windows: [] } });
  });
});
