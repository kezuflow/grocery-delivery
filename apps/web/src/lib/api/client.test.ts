import { describe, expect, it } from "vitest";

import { createApiClient, createSameOriginApiTransport } from "./client.js";

function transport(response: unknown, status = 200, inspect?: (init?: RequestInit) => void) {
  return {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof URL ? input : typeof input === "string" ? input : input.url;
      expect(new URL(url).pathname).toMatch(
        /^\/api\/v1\/(plans|catalog|me|cart|delivery-address|delivery-windows|deliveryman\/assignments|deliveryman\/events|subscription|orders|order-substitutions|payments|admin)/,
      );
      inspect?.(init);
      return Promise.resolve(Response.json(response, { status }));
    },
  };
}

const meta = { correlationId: "test-correlation" };

describe("web API client", () => {
  it("requests public plans and validates the shared response contract", async () => {
    const client = createApiClient(
      transport({
        data: { plans: [] },
        meta,
      }),
    );

    await expect(client.listPlans()).resolves.toMatchObject({ data: { plans: [] } });
  });

  it("turns the API error envelope into a typed client error", async () => {
    const client = createApiClient(
      transport(
        {
          error: { code: "SERVICE_UNAVAILABLE", message: "try later" },
          meta,
        },
        503,
      ),
    );

    await expect(client.listCatalog()).rejects.toMatchObject({
      name: "ApiClientError",
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      message: "try later",
      correlationId: "test-correlation",
    });
  });

  it("retries a rate-limited request once after five seconds", async () => {
    let calls = 0;
    const waits: number[] = [];
    const client = createApiClient(
      {
        fetch: () => {
          calls += 1;
          return Promise.resolve(
            calls === 1
              ? Response.json(
                  { error: { code: "RATE_LIMITED", message: "try later" }, meta },
                  { status: 429 },
                )
              : Response.json({ data: { plans: [] }, meta }),
          );
        },
      },
      {
        sleep: (milliseconds) => {
          waits.push(milliseconds);
          return Promise.resolve();
        },
      },
    );

    await expect(client.listPlans()).resolves.toMatchObject({ data: { plans: [] } });
    expect(calls).toBe(2);
    expect(waits).toEqual([5000]);
  });

  it("rejects malformed successful payloads before the UI can use them", async () => {
    const client = createApiClient(transport({ data: { plans: "not-an-array" }, meta }));

    await expect(client.listPlans()).rejects.toThrow();
  });

  it("validates the server-owned current-session response", async () => {
    const client = createApiClient(
      transport({
        data: {
          sessionId: "session-1",
          userId: "user-1",
          role: "customer",
          adminPermissions: [],
          customerId: "customer-1",
          expiresAt: "2026-09-01T00:00:00.000Z",
        },
        meta,
      }),
    );

    await expect(client.getCurrentSession()).resolves.toMatchObject({
      data: { userId: "user-1", customerId: "customer-1" },
    });
  });

  it("loads customer-owned order history through the shared response contract", async () => {
    const client = createApiClient(
      transport({
        data: {
          orders: [
            {
              id: "order-1",
              subscriptionId: "subscription-1",
              planId: "plan-small",
              cycleId: "cycle-2026-08-22",
              lines: [],
              weeklyCredit: { centavos: 10000, currency: "PHP" },
              totals: {
                subtotal: { centavos: 10000, currency: "PHP" },
                discount: { centavos: 0, currency: "PHP" },
                weeklyFee: { centavos: 0, currency: "PHP" },
                includedCredit: { centavos: 10000, currency: "PHP" },
                overage: { centavos: 0, currency: "PHP" },
                deliveryFee: { centavos: 0, currency: "PHP" },
                totalDue: { centavos: 0, currency: "PHP" },
              },
              appliedPromotion: null,
              deliveryAddress: null,
              deliveryWindow: null,
              paymentState: "unpaid",
              status: "locked",
              lockedAt: "2026-08-20T00:00:00.000Z",
            },
          ],
        },
        meta,
      }),
    );

    await expect(client.getOrderHistory()).resolves.toMatchObject({
      data: { orders: [{ id: "order-1", cycleId: "cycle-2026-08-22" }] },
    });
  });

  it("updates a cart with only SKU identifiers and quantities", async () => {
    const client = createApiClient(
      transport(
        {
          data: {
            lines: [
              {
                skuId: "sku-1",
                quantity: 2,
                unitPrice: { centavos: 10000, currency: "PHP" },
              },
            ],
            subtotal: { centavos: 20000, currency: "PHP" },
            updatedAt: "2026-08-19T00:00:00.000Z",
          },
          meta,
        },
        200,
        (init) => {
          expect(init?.method).toBe("PUT");
          expect(typeof init?.body).toBe("string");
          expect(JSON.parse(init?.body as string)).toEqual({
            lines: [{ skuId: "sku-1", quantity: 2 }],
          });
        },
      ),
    );

    await expect(
      client.updateCart({ lines: [{ skuId: "sku-1", quantity: 2 }] }),
    ).resolves.toMatchObject({ data: { subtotal: { centavos: 20000 } } });
  });

  it("rebases browser API requests onto the same origin", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    const fetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, ...(init ? { init } : {}) });
      return Promise.resolve(Response.json({ ok: true }));
    };

    await createSameOriginApiTransport(fetchImplementation).fetch(
      new URL("https://carbon-api.internal/api/v1/cart?preview=1"),
      { method: "PUT" },
    );

    expect(calls).toEqual([{ input: "/api/v1/cart?preview=1", init: { method: "PUT" } }]);
  });

  it("submits a subscription action with a caller-owned idempotency key", async () => {
    const client = createApiClient(
      transport(
        {
          data: {
            id: "subscription-1",
            customerId: "customer-1",
            planId: "plan-small",
            status: "paused",
            skippedCycleId: null,
            lastAction: "pause",
            createdAt: "2026-08-18T00:00:00.000Z",
            updatedAt: "2026-08-19T00:00:00.000Z",
          },
          meta,
        },
        200,
        (init) => {
          expect(init?.method).toBe("POST");
          expect(new Headers(init?.headers).get("idempotency-key")).toBe("subscription-action-1");
          expect(JSON.parse(init?.body as string)).toEqual({ action: "pause" });
        },
      ),
    );

    await expect(
      client.performSubscriptionAction({ action: "pause" }, "subscription-action-1"),
    ).resolves.toMatchObject({ data: { status: "paused", lastAction: "pause" } });
  });

  it("creates a subscription with only a plan identifier", async () => {
    const client = createApiClient(
      transport(
        {
          data: {
            id: "subscription-1",
            customerId: "customer-1",
            planId: "plan-small",
            status: "active",
            skippedCycleId: null,
            lastAction: null,
            createdAt: "2026-08-20T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          meta,
        },
        201,
        (init) => {
          expect(init?.method).toBe("POST");
          expect(new Headers(init?.headers).get("idempotency-key")).toBe("subscription-create-1");
          expect(JSON.parse(init?.body as string)).toEqual({ planId: "plan-small" });
        },
      ),
    );

    await expect(
      client.createSubscription({ planId: "plan-small" }, "subscription-create-1"),
    ).resolves.toMatchObject({ data: { planId: "plan-small", status: "active" } });
  });

  it("changes plans with only the selected plan identifier", async () => {
    const client = createApiClient(
      transport(
        {
          data: {
            id: "subscription-1",
            customerId: "customer-1",
            planId: "plan-medium",
            status: "active",
            billingStatus: "current",
            effectiveCycleId: "cycle-2026-08-22",
            skippedCycleId: null,
            lastAction: null,
            createdAt: "2026-08-18T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          meta,
        },
        200,
        (init) => {
          expect(new Headers(init?.headers).get("idempotency-key")).toBe("change-plan-1");
          expect(JSON.parse(init?.body as string)).toEqual({
            action: "change-plan",
            planId: "plan-medium",
          });
        },
      ),
    );

    await expect(
      client.performSubscriptionAction(
        { action: "change-plan", planId: "plan-medium" },
        "change-plan-1",
      ),
    ).resolves.toMatchObject({ data: { planId: "plan-medium" } });
  });

  it("creates an order from the saved cart without client commerce fields", async () => {
    const client = createApiClient(
      transport(
        {
          data: {
            id: "order-1",
            subscriptionId: "subscription-1",
            planId: "plan-small",
            cycleId: "cycle-2026-08-22",
            lines: [
              { skuId: "sku-1", quantity: 2, unitPrice: { centavos: 10000, currency: "PHP" } },
            ],
            weeklyCredit: { centavos: 50000, currency: "PHP" },
            totals: {
              subtotal: { centavos: 20000, currency: "PHP" },
              weeklyFee: { centavos: 10000, currency: "PHP" },
              includedCredit: { centavos: 20000, currency: "PHP" },
              overage: { centavos: 0, currency: "PHP" },
              deliveryFee: { centavos: 0, currency: "PHP" },
              totalDue: { centavos: 10000, currency: "PHP" },
            },
            status: "locked",
            lockedAt: "2026-08-19T00:00:00.000Z",
          },
          meta,
        },
        201,
        (init) => {
          expect(init?.method).toBe("POST");
          expect(new Headers(init?.headers).get("idempotency-key")).toBe("order-1");
          expect(JSON.parse(init?.body as string)).toEqual({});
        },
      ),
    );

    await expect(client.createOrder({}, "order-1")).resolves.toMatchObject({
      data: { id: "order-1", status: "locked" },
    });
  });

  it("updates a delivery address without customer ownership fields", async () => {
    const client = createApiClient(
      transport(
        {
          data: {
            recipientName: "Maria Santos",
            phone: "+639171234567",
            line1: "12 Green Street",
            line2: null,
            barangay: "Bagong Pagasa",
            city: "Quezon City",
            province: "Metro Manila",
            postalCode: "1105",
            instructions: null,
            serviceable: true,
            createdAt: "2026-08-19T00:00:00.000Z",
            updatedAt: "2026-08-20T00:00:00.000Z",
          },
          meta,
        },
        200,
        (init) => {
          expect(init?.method).toBe("PUT");
          expect(JSON.parse(init?.body as string)).not.toHaveProperty("customerId");
        },
      ),
    );

    await expect(
      client.updateDeliveryAddress({
        recipientName: "Maria Santos",
        phone: "+639171234567",
        line1: "12 Green Street",
        line2: null,
        barangay: "Bagong Pagasa",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "1105",
        instructions: null,
      }),
    ).resolves.toMatchObject({ data: { city: "Quezon City" } });
  });

  it("submits an idempotent customer substitution decision", async () => {
    const client = createApiClient(
      transport(
        {
          data: {
            id: "substitution-1",
            customerId: "customer-1",
            orderId: "order-1",
            shortageId: "shortage-1",
            originalSkuId: "sku-1",
            procurementSubstitutionId: "procurement-substitution-1",
            substituteSkuId: "sku-2",
            quantity: 1,
            status: "accepted",
            decidedAt: "2026-08-21T01:00:00.000Z",
            createdAt: "2026-08-21T00:00:00.000Z",
            updatedAt: "2026-08-21T01:00:00.000Z",
          },
          meta,
        },
        200,
        (init) => {
          expect(init?.method).toBe("POST");
          expect(new Headers(init?.headers).get("idempotency-key")).toBe("decision-1");
          expect(JSON.parse(init?.body as string)).toEqual({ decision: "accept" });
        },
      ),
    );
    await expect(
      client.decideOrderSubstitution("substitution-1", "accept", "decision-1"),
    ).resolves.toMatchObject({ data: { status: "accepted" } });
  });

  it("submits a superadmin launch manifest without a client-owned final price", async () => {
    const client = createApiClient(
      transport(
        {
          data: {
            idempotencyKey: "launch-1",
            categoryCount: 1,
            skuCount: 1,
            deliveryWindowCount: 1,
            appliedAt: "2026-08-21T08:00:00.000Z",
            replayed: false,
          },
          meta,
        },
        200,
        (init) => {
          expect(init?.method).toBe("PUT");
          expect(new Headers(init?.headers).get("idempotency-key")).toBe("launch-1");
          expect(JSON.parse(init?.body as string)).toEqual(launchConfiguration());
        },
      ),
    );

    await expect(
      client.applyLaunchConfiguration(launchConfiguration(), "launch-1"),
    ).resolves.toMatchObject({
      data: { skuCount: 1, replayed: false },
    });
    expect(() =>
      client.applyLaunchConfiguration(
        {
          ...launchConfiguration(),
          skus: [{ ...launchConfiguration().skus[0], price: { centavos: 1, currency: "PHP" } }],
        },
        "launch-2",
      ),
    ).toThrow();
  });

  it("lists customer payment methods without exposing provider tokens", async () => {
    const client = createApiClient(
      transport({
        data: {
          methods: [
            {
              id: "method-1",
              providerReference: "provider-1",
              type: "ewallet",
              status: "active",
              createdAt: "2026-08-20T00:00:00.000Z",
              updatedAt: "2026-08-20T00:00:00.000Z",
            },
          ],
        },
        meta,
      }),
    );

    await expect(client.getPaymentMethods()).resolves.toMatchObject({
      data: { methods: [{ id: "method-1", type: "ewallet", status: "active" }] },
    });
  });
});

function launchConfiguration() {
  return {
    reason: "Approved staging launch manifest",
    categories: [{ id: "fruit", name: "Fruit", slug: "fruit", active: true }],
    skus: [
      {
        id: "banana-kg",
        categoryId: "fruit",
        name: "Bananas",
        slug: "bananas",
        description: "Fresh bananas",
        unit: "kilogram",
        imageUrl: null,
        procurementCostCentavos: 10_000,
        markupBasisPoints: 2_500,
        priceEffectiveAt: "2026-08-21T08:00:00.000Z",
        active: true,
      },
    ],
    deliveryWindows: [
      {
        id: "window-1",
        cycleId: "cycle-2026-08-22",
        label: "Saturday morning",
        startsAt: "2026-08-22T00:00:00.000Z",
        endsAt: "2026-08-22T04:00:00.000Z",
        capacity: 50,
        active: true,
      },
    ],
  };
}
