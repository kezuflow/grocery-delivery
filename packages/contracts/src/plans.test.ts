import { describe, expect, it } from "vitest";

import { plansListResponseSchema } from "./plans.js";

describe("plan contracts", () => {
  it("accepts a public plan list with PHP fee and credit", () => {
    expect(
      plansListResponseSchema.parse({
        data: {
          plans: [
            {
              id: "plan-small",
              code: "family-box",
              name: "Family Box",
              weeklyFee: { centavos: 199_900, currency: "PHP" },
              weeklyCredit: { centavos: 199_900, currency: "PHP" },
              displayOrder: 10,
              active: true,
            },
          ],
        },
        meta: { correlationId: "plans-request" },
      }),
    ).toBeDefined();
  });
});
