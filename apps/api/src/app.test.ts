import { describe, expect, it } from "vitest";

import {
  apiErrorResponseSchema,
  catalogListResponseSchema,
  currentSessionResponseSchema,
  healthResponseSchema,
  planResponseSchema,
  plansListResponseSchema,
  subscriptionResponseSchema,
} from "@carbon/contracts";
import {
  DefaultSubscriptionCommandService,
  InMemoryIdempotencyStore,
  InMemorySubscriptionRepository,
} from "@carbon/application";
import { createSession, createSubscription } from "@carbon/domain";
import { InMemoryPlanReader, InMemorySubscriptionReader } from "@carbon/db";
import { createApi } from "./app.js";

describe("API worker", () => {
  const app = createApi({
    generateCorrelationId: () => "generated-request",
    now: () => new Date("2026-08-18T00:00:00.000Z"),
    version: "test-version",
    sink: () => undefined,
  });

  it("returns the unversioned infrastructure health check", async () => {
    const response = await app.request("/health", {
      headers: { "x-correlation-id": "health-request" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe("health-request");
    healthResponseSchema.parse(await response.json());
  });

  it("returns the versioned health contract", async () => {
    const response = await app.request(
      "/api/v1/health",
      {
        headers: { "x-correlation-id": "api-request" },
      },
      { APP_ENV: "test", VERSION: "worker-test" },
    );
    const body = healthResponseSchema.parse(await response.json());

    expect(body.data.version).toBe("worker-test");
    expect(body.meta.correlationId).toBe("api-request");
  });

  it("lists active plan definitions with cache headers", async () => {
    const response = await app.request("/api/v1/plans", undefined, { APP_ENV: "test" });
    const body = plansListResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.data.plans.map((plan) => plan.code)).toEqual(["small", "medium", "large"]);
    expect(body.data.plans.map((plan) => plan.weeklyCredit.centavos)).toEqual([
      69_900, 99_900, 139_900,
    ]);
    expect(response.headers.get("cache-control")).toContain("s-maxage=300");
    expect(response.headers.get("x-plan-cache-version")).toBe("fixture-1");
  });

  it("lists administrator-configured plan settings", async () => {
    const configuredApp = createApi({
      sink: () => undefined,
      planReader: new InMemoryPlanReader([
        {
          id: "plan-family",
          code: "family-box",
          name: "Family Box",
          weeklyFee: { centavos: 199_900, currency: "PHP" },
          weeklyCredit: { centavos: 210_000, currency: "PHP" },
          displayOrder: 10,
          active: true,
        },
      ]),
    });
    const response = await configuredApp.request("/api/v1/plans", undefined, { APP_ENV: "test" });
    const body = plansListResponseSchema.parse(await response.json());

    expect(body.data.plans).toMatchObject([
      { code: "family-box", weeklyFee: { centavos: 199_900 }, weeklyCredit: { centavos: 210_000 } },
    ]);
  });

  it("allows pricing admins to update plan settings and invalidates the plan cache", async () => {
    const planRepository = new InMemoryPlanReader();
    const adminApp = createApi({
      now: () => new Date("2026-08-18T01:00:00.000Z"),
      sink: () => undefined,
      planRepository,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-admin",
              userId: "admin-1",
              role: "admin",
              adminPermissions: ["pricing"],
              customerId: null,
              expiresAt: "2026-08-19T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const response = await adminApp.request(
      "/api/v1/admin/plans/plan-small",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: "small",
          name: "Small",
          weeklyFee: { centavos: 69_900, currency: "PHP" },
          weeklyCredit: { centavos: 69_900, currency: "PHP" },
          displayOrder: 10,
          active: true,
        }),
      },
      { APP_ENV: "test" },
    );
    const body = planResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.data.code).toBe("small");
    await expect(planRepository.getCacheVersion?.()).resolves.toBe("fixture-2");
  });

  it("rejects plan writes without pricing permission", async () => {
    const adminApp = createApi({
      sink: () => undefined,
      planRepository: new InMemoryPlanReader(),
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-admin",
              userId: "admin-1",
              role: "admin",
              adminPermissions: ["catalog"],
              customerId: null,
              expiresAt: "2026-08-19T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const response = await adminApp.request("/api/v1/admin/plans/plan-small", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = apiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("executes an authenticated subscription action with an idempotency key", async () => {
    const subscriptionService = new DefaultSubscriptionCommandService(
      new InMemorySubscriptionRepository([
        createSubscription({
          id: "subscription-1",
          customerId: "customer-1",
          planId: "plan-small",
          status: "active",
          skippedCycleId: null,
          lastAction: null,
          createdAt: "2026-08-18T00:00:00.000Z",
          updatedAt: "2026-08-18T00:00:00.000Z",
        }),
      ]),
      new InMemoryIdempotencyStore(),
    );
    const authenticatedApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2026-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
      subscriptionService,
    });
    const response = await authenticatedApp.request(
      "/api/v1/subscription/actions",
      {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "action-1" },
        body: JSON.stringify({ action: "pause" }),
      },
      { APP_ENV: "test" },
    );
    const body = subscriptionResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("paused");
  });

  it("returns the authenticated customer's current subscription", async () => {
    const authenticatedApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2026-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
      subscriptionReader: new InMemorySubscriptionReader([
        createSubscription({
          id: "subscription-1",
          customerId: "customer-1",
          planId: "plan-small",
          status: "active",
          skippedCycleId: null,
          lastAction: null,
          createdAt: "2026-08-18T00:00:00.000Z",
          updatedAt: "2026-08-18T00:00:00.000Z",
        }),
      ]),
    });

    const response = await authenticatedApp.request("/api/v1/subscription", undefined, {
      APP_ENV: "test",
    });
    const body = subscriptionResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body.data.customerId).toBe("customer-1");
  });

  it("returns not found when the authenticated customer has no subscription", async () => {
    const authenticatedApp = createApi({
      sink: () => undefined,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2026-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
      subscriptionReader: new InMemorySubscriptionReader(),
    });
    const response = await authenticatedApp.request("/api/v1/subscription", undefined, {
      APP_ENV: "test",
    });
    const body = apiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("SUBSCRIPTION_NOT_FOUND");
  });

  it("returns a consistent error envelope for unknown routes", async () => {
    const response = await app.request("/api/v1/unknown", {
      headers: { "x-correlation-id": "missing-route" },
    });
    const body = apiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.meta.correlationId).toBe("missing-route");
  });

  it("rejects a non-HTTPS production CORS origin during request setup", async () => {
    const response = await app.request(
      "/api/v1/health",
      {
        headers: { origin: "http://example.com" },
      },
      { APP_ENV: "production", CORS_ORIGINS: "http://example.com" },
    );

    expect(response.status).toBe(500);
  });

  it("lists active catalog items with bounded cursors and cache headers", async () => {
    const first = await app.request("/api/v1/catalog?limit=1", undefined, { APP_ENV: "test" });
    const firstBody = catalogListResponseSchema.parse(await first.json());

    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toContain("s-maxage=300");
    expect(firstBody.data.items).toHaveLength(1);
    expect(firstBody.data.nextCursor).toBeTruthy();

    const second = await app.request(
      `/api/v1/catalog?limit=100&cursor=${firstBody.data.nextCursor}`,
      undefined,
      { APP_ENV: "test" },
    );
    const secondBody = catalogListResponseSchema.parse(await second.json());

    expect(second.status).toBe(200);
    expect(secondBody.data.items.map((item) => item.id)).toEqual(["sku-oats"]);
  });

  it("rejects invalid catalog pagination", async () => {
    const response = await app.request("/api/v1/catalog?limit=101", undefined, { APP_ENV: "test" });

    expect(response.status).toBe(400);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.code).toBe("INVALID_CATALOG_PAGINATION");
  });

  it("returns a cache validator and honors conditional catalog reads", async () => {
    const first = await app.request("/api/v1/catalog?limit=1", undefined, {
      APP_ENV: "test",
      CATALOG_CACHE_VERSION: "catalog-2",
    });
    const etag = first.headers.get("etag");

    expect(etag).toBeTruthy();
    expect(first.headers.get("x-catalog-cache-version")).toBe("catalog-2");

    const second = await app.request(
      "/api/v1/catalog?limit=1",
      { headers: { "if-none-match": etag ?? "" } },
      { APP_ENV: "test", CATALOG_CACHE_VERSION: "catalog-2" },
    );

    expect(second.status).toBe(304);
  });

  it("returns an empty page for an unknown category", async () => {
    const response = await app.request("/api/v1/catalog?category=does-not-exist", undefined, {
      APP_ENV: "test",
    });
    const body = catalogListResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.data.items).toEqual([]);
  });

  it("requires an active session for protected routes", async () => {
    const unauthenticated = await app.request("/api/v1/me", undefined, { APP_ENV: "test" });

    expect(unauthenticated.status).toBe(401);
    const unauthenticatedBody = apiErrorResponseSchema.parse(await unauthenticated.json());
    expect(unauthenticatedBody.error.code).toBe("UNAUTHENTICATED");

    const authenticatedApp = createApi({
      generateCorrelationId: () => "session-request",
      now: () => new Date("2026-08-18T00:00:00.000Z"),
      sink: () => undefined,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2026-08-19T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const authenticated = await authenticatedApp.request("/api/v1/me", undefined, {
      APP_ENV: "test",
    });

    expect(authenticated.status).toBe(200);
    const authenticatedBody = currentSessionResponseSchema.parse(await authenticated.json());
    expect(authenticatedBody.data.customerId).toBe("customer-1");
  });
});
