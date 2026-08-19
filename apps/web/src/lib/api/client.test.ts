import { describe, expect, it } from "vitest";

import { createApiClient, createSameOriginApiTransport } from "./client.js";

function transport(response: unknown, status = 200, inspect?: (init?: RequestInit) => void) {
  return {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof URL ? input : typeof input === "string" ? input : input.url;
      expect(new URL(url).pathname).toMatch(/^\/api\/v1\/(plans|catalog|me|cart)$/);
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
    });
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
});
