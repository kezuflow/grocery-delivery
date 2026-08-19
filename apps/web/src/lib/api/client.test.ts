import { describe, expect, it } from "vitest";

import { createApiClient } from "./client.js";

function transport(response: unknown, status = 200) {
  return {
    fetch: (input: RequestInfo | URL) => {
      const url = input instanceof URL ? input : typeof input === "string" ? input : input.url;
      expect(new URL(url).pathname).toMatch(/^\/api\/v1\/(plans|catalog|me)$/);
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
});
