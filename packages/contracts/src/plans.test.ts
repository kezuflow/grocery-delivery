import { describe, expect, it } from "vitest";

import { planAdminUpsertRequestSchema, plansListResponseSchema } from "./plans.js";

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

  it("accepts administrator plan settings with custom slugs", () => {
    expect(
      planAdminUpsertRequestSchema.parse({
        code: "family-box",
        name: "Family Box",
        weeklyFee: { centavos: 199_900, currency: "PHP" },
        weeklyCredit: { centavos: 210_000, currency: "PHP" },
        displayOrder: 5,
        active: true,
      }),
    ).toMatchObject({ code: "family-box" });
  });
});
