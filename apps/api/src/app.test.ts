import { describe, expect, it } from "vitest";

import {
  apiErrorResponseSchema,
  cartResponseSchema,
  catalogListResponseSchema,
  currentSessionResponseSchema,
  deliveryAddressResponseSchema,
  deliveryAddressesResponseSchema,
  deliveryWindowsResponseSchema,
  dispatchResponseSchema,
  operationalProjectionResponseSchema,
  deliverymanAssignmentsResponseSchema,
  deliveryEventResponseSchema,
  deliveryTrackingResponseSchema,
  deliveryMediaUploadResponseSchema,
  deliveryMediaListResponseSchema,
  healthResponseSchema,
  orderResponseSchema,
  paymentAttemptResponseSchema,
  paymentMethodListResponseSchema,
  paymentMethodResponseSchema,
  paymentRefundResponseSchema,
  paymentWebhookResponseSchema,
  planChangeRequestResponseSchema,
  planResponseSchema,
  plansListResponseSchema,
  subscriptionResponseSchema,
  activePromotionBannersResponseSchema,
  promotionBannerResponseSchema,
  promotionMediaUploadResponseSchema,
  notificationPreferencesResponseSchema,
  supportCaseResponseSchema,
  supportCasesResponseSchema,
  customerOrderRequestResponseSchema,
  customerOrderRequestsResponseSchema,
  customerOrderSubstitutionResponseSchema,
  customerOrderSubstitutionsResponseSchema,
  launchConfigurationResponseSchema,
} from "@carbon/contracts";
import {
  DefaultCartLockService,
  DefaultPlanApprovalService,
  DefaultSubscriptionCommandService,
  DefaultSubscriptionCreationService,
  InMemoryPlanApprovalRepository,
  InMemoryIdempotencyStore,
  InMemoryOrderRepository,
  InMemoryOutboxPublisher,
  InMemorySubscriptionRepository,
  InMemoryLaunchConfigurationRepository,
  LaunchConfigurationService,
} from "@carbon/application";
import {
  DefaultPaymentService,
  FakePaymentProvider,
  InMemoryPaymentRepository,
} from "@carbon/billing";
import {
  createCart,
  createCartLine,
  createLockedOrder,
  createMoney,
  createSession,
  createSubscription,
  assignWeeklyCycle,
} from "@carbon/domain";
import {
  createDefaultCatalogReader,
  InMemoryCartRepository,
  InMemoryDeliveryAddressRepository,
  InMemoryDeliveryWindowRepository,
  InMemoryDispatchRepository,
  InMemoryDeliveryEventRepository,
  InMemoryDeliveryTrackingRepository,
  InMemoryDeliveryMediaRepository,
  InMemoryProcurementRepository,
  InMemoryPlanReader,
  InMemorySubscriptionReader,
  InMemoryOperationalProjectionRepository,
  InMemoryPromotionBannerRepository,
  InMemorySupportCaseRepository,
  InMemoryNotificationPreferencesRepository,
  InMemoryCustomerOrderRequestRepository,
  InMemoryCustomerOrderSubstitutionRepository,
} from "@carbon/db";
import { createApi } from "./app.js";
import { createInMemoryMetricsSink } from "@carbon/observability";

describe("API worker", () => {
  it("authenticates and dispatches internal outbox messages by lane", async () => {
    const calls: string[] = [];
    const app = createApi({
      eventProcessorToken: "processor-token",
      eventProcessor: (kind, message) => {
        calls.push(`${kind}:${message.outboxEventId}`);
        return Promise.resolve();
      },
    });
    const request = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-event-processor": "notification",
        "x-event-processor-token": "processor-token",
      },
      body: JSON.stringify({
        outboxEventId: "event-1",
        eventType: "order.locked",
        aggregateId: "order-1",
        occurredAt: "2026-08-20T00:00:00.000Z",
        payloadJson: "{}",
        claimToken: "claim-1",
        correlationId: "correlation-1",
      }),
    } as const;

    const response = await app.request("/internal/events/outbox", request);
    expect(response.status).toBe(202);
    expect(calls).toEqual(["notification:event-1"]);
  });

  it("rejects internal processor requests with a missing or invalid token", async () => {
    const app = createApi({
      eventProcessorToken: "processor-token",
      eventProcessor: () => Promise.resolve(),
    });
    const response = await app.request(
      "/internal/events/outbox",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-event-processor": "notification",
        },
        body: "{}",
      },
      { APP_ENV: "staging" },
    );
    expect(response.status).toBe(401);
  });

  it("returns actionable validation errors before invoking the handler", async () => {
    let called = false;
    const app = createApi({
      eventProcessor: () => {
        called = true;
        return Promise.resolve();
      },
    });
    const response = await app.request("/internal/events/outbox", {
      method: "POST",
      headers: { "x-event-processor": "unknown" },
      body: "{}",
    });
    expect(response.status).toBe(400);
    expect(called).toBe(false);
  });

  it("rejects lane mismatches and returns processor failures", async () => {
    const app = createApi({
      eventProcessor: () => Promise.reject(new Error("provider unavailable")),
    });
    const body = JSON.stringify({
      outboxEventId: "event-1",
      eventType: "payment.reconcile",
      aggregateId: "payment-1",
      occurredAt: "2026-08-20T00:00:00.000Z",
      payloadJson: "{}",
      claimToken: "claim-1",
      correlationId: "correlation-1",
    });
    const mismatch = await app.request("/internal/events/outbox", {
      method: "POST",
      headers: { "content-type": "application/json", "x-event-processor": "notification" },
      body,
    });
    expect(mismatch.status).toBe(400);

    const failed = await app.request("/internal/events/outbox", {
      method: "POST",
      headers: { "content-type": "application/json", "x-event-processor": "payment" },
      body,
    });
    expect(failed.status).toBe(500);
  });

  it("keeps account lifecycle operations scoped to the active user", async () => {
    const calls: string[] = [];
    const identityRepository = {
      findUser: () =>
        Promise.resolve({
          id: "customer-1",
          email: "customer@example.com",
          name: "Customer One",
          emailVerified: true,
          imageUrl: null,
          createdAt: "2026-08-18T00:00:00.000Z",
          updatedAt: "2026-08-18T00:00:00.000Z",
        }),
      updateUserName: (userId: string, name: string) => {
        calls.push(`profile:${userId}:${name}`);
        return Promise.resolve();
      },
      listSessions: () =>
        Promise.resolve([
          {
            id: "session-customer",
            createdAt: "2026-08-18T00:00:00.000Z",
            expiresAt: "2026-09-18T00:00:00.000Z",
            revokedAt: null,
          },
        ]),
      revokeSession: (sessionId: string) => {
        calls.push(`revoke:${sessionId}`);
        return Promise.resolve();
      },
      revokeAllSessions: (userId: string) => {
        calls.push(`revoke-all:${userId}`);
        return Promise.resolve();
      },
      listConsents: () => Promise.resolve([]),
      saveConsent: (consent: { userId: string; purpose: string }) => {
        calls.push(`consent:${consent.userId}:${consent.purpose}`);
        return Promise.resolve();
      },
      saveAuditEvent: (event: { action: string }) => {
        calls.push(`audit:${event.action}`);
        return Promise.resolve();
      },
      findDeletionBlockingReasons: () => Promise.resolve(["ACTIVE_SUBSCRIPTION"]),
      findCommandResult: () => Promise.resolve(null),
      saveCommandResult: () => Promise.resolve(),
      findRoleAssignment: () => Promise.resolve(null),
      saveRoleAssignment: () => Promise.resolve(),
    };
    const accountApp = createApi({
      generateCorrelationId: () => "account-request",
      identityRepository,
      now: () => new Date("2026-08-20T00:00:00.000Z"),
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-customer",
              userId: "customer-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2026-09-20T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
      sink: () => undefined,
    });

    const exported = await accountApp.request("/api/v1/account/export");
    const profile = await accountApp.request("/api/v1/account/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Corrected Name" }),
    });
    const consent = await accountApp.request("/api/v1/account/consents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose: "marketing", granted: false, policyVersion: "2026-08" }),
    });
    const foreignSession = await accountApp.request("/api/v1/account/sessions/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: "another-users-session" }),
    });
    const eligibility = await accountApp.request("/api/v1/account/deletion-eligibility");
    const deletion = await accountApp.request("/api/v1/account/deletion-request", {
      method: "POST",
      headers: { "idempotency-key": "delete-customer-1" },
    });

    expect(exported.status).toBe(200);
    expect(profile.status).toBe(200);
    expect(consent.status).toBe(201);
    expect(foreignSession.status).toBe(404);
    expect(eligibility.status).toBe(200);
    expect(deletion.status).toBe(409);
    await expect(eligibility.json()).resolves.toMatchObject({
      data: { eligible: false, reasons: ["ACTIVE_SUBSCRIPTION"] },
    });
    expect(calls).toEqual(
      expect.arrayContaining([
        "profile:customer-1:Corrected Name",
        "consent:customer-1:marketing",
        "audit:identity.profile-corrected",
        "audit:identity.consent-recorded",
        "audit:identity.account-deletion-requested",
      ]),
    );
    expect(calls.some((call) => call.includes("another-users-session"))).toBe(false);
  });

  it("rate-limits sensitive writes and emits correlation-aware metrics", async () => {
    const metrics = createInMemoryMetricsSink();
    const app = createApi({
      generateCorrelationId: () => "rate-limit-request",
      now: () => new Date("2026-08-19T00:00:00.000Z"),
      metrics: metrics.sink,
      rateLimitPolicies: [
        {
          name: "test-write",
          maxRequests: 1,
          windowSeconds: 60,
          methods: ["POST"],
          pathPrefixes: ["/api/v1/orders"],
        },
      ],
      sink: () => undefined,
    });

    const health = await app.request("/health");
    const first = await app.request("/api/v1/orders", { method: "POST" });
    const second = await app.request("/api/v1/orders", { method: "POST" });

    expect(first.status).toBe(401);
    expect(second.status).toBe(429);
    expect(second.headers.get("retry-after")).toBe("60");
    const limitedBody = apiErrorResponseSchema.parse(await second.json());
    expect(limitedBody.meta.correlationId).toBe("rate-limit-request");
    expect(health.status).toBe(200);
    expect(metrics.metrics.map((metric) => metric.status)).toEqual([200, 401, 429]);
    expect(metrics.metrics.every((metric) => metric.correlationId === "rate-limit-request")).toBe(
      true,
    );
  });

  it("records failed middleware requests as server errors", async () => {
    const metrics = createInMemoryMetricsSink();
    const app = createApi({
      generateCorrelationId: () => "failed-request",
      metrics: metrics.sink,
      rateLimitPolicies: [
        {
          name: "failing-policy",
          maxRequests: 1,
          windowSeconds: 60,
          methods: ["POST"],
          pathPrefixes: ["/api/v1/orders"],
        },
      ],
      rateLimiter: {
        check: () => Promise.reject(new Error("rate limiter unavailable")),
      },
      sink: () => undefined,
    });

    const response = await app.request("/api/v1/orders", { method: "POST" });

    expect(response.status).toBe(500);
    expect(metrics.metrics).toHaveLength(1);
    expect(metrics.metrics[0]).toMatchObject({
      correlationId: "failed-request",
      path: "/api/v1/orders",
      status: 500,
    });
  });
  it("delegates auth routes without applying API session protection", async () => {
    const authApp = createApi({
      sink: () => undefined,
      betterAuthApi: {
        getSession: () => Promise.resolve(null),
        handler: (request) =>
          Promise.resolve(Response.json({ path: new URL(request.url).pathname }, { status: 202 })),
      },
    });

    const response = await authApp.request("/api/auth/ok");

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ path: "/api/auth/ok" });
  });

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
    expect(response.headers.get("cache-control")).toBe("no-store");
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
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("serves the generated OpenAPI document", async () => {
    const response = await app.request("/openapi.json");
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('"openapi":"3.1.0"');
    const secondResponse = await app.request("/openapi.json");
    await expect(secondResponse.text()).resolves.toContain('"/api/v1/orders"');
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
              adminPermissions: ["pricing", "finance"],
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
      now: () => new Date("2026-08-18T01:00:00.000Z"),
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

  it("applies and replays a superadmin launch configuration", async () => {
    const repository = new InMemoryLaunchConfigurationRepository();
    const launchConfigurationService = new LaunchConfigurationService(
      repository,
      () => "audit-launch-1",
    );
    const adminApp = createApi({
      now: () => new Date("2026-08-21T08:00:00.000Z"),
      generateCorrelationId: () => "correlation-launch-1",
      sink: () => undefined,
      launchConfigurationService,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-superadmin",
              userId: "admin-1",
              role: "admin",
              adminPermissions: ["superadmin"],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
              mfaRequired: true,
              mfaVerified: true,
            }),
          ),
      },
    });
    const request = (body: unknown, idempotencyKey?: string) =>
      adminApp.request("/api/v1/admin/launch-configuration", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
        },
        body: JSON.stringify(body),
      });

    const first = await request(launchConfigurationFixture(), "launch-1");
    const firstBody = launchConfigurationResponseSchema.parse(await first.json());
    expect(first.status).toBe(200);
    expect(firstBody).toMatchObject({
      data: { skuCount: 1, replayed: false },
      meta: { correlationId: "correlation-launch-1" },
    });

    const replay = await request(launchConfigurationFixture(), "launch-1");
    expect(launchConfigurationResponseSchema.parse(await replay.json()).data.replayed).toBe(true);
    expect(repository.applied).toHaveLength(1);

    const conflict = await request(
      { ...launchConfigurationFixture(), reason: "A different approval" },
      "launch-1",
    );
    expect(conflict.status).toBe(409);
    expect(apiErrorResponseSchema.parse(await conflict.json()).error.code).toBe(
      "IDEMPOTENCY_CONFLICT",
    );

    const missingKey = await request(launchConfigurationFixture());
    expect(missingKey.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await missingKey.json()).error.code).toBe(
      "IDEMPOTENCY_KEY_REQUIRED",
    );

    const invalid = await request(
      {
        ...launchConfigurationFixture(),
        categories: [
          launchConfigurationFixture().categories[0],
          { id: "fruit-2", name: "More Fruit", slug: "fruit", active: true },
        ],
      },
      "launch-2",
    );
    expect(invalid.status).toBe(400);
    expect(apiErrorResponseSchema.parse(await invalid.json()).error.code).toBe(
      "INVALID_LAUNCH_CONFIGURATION",
    );
  });

  it("reports launch configuration persistence failures as internal errors", async () => {
    const adminApp = createApi({
      generateCorrelationId: () => "correlation-launch-failure",
      sink: () => undefined,
      launchConfigurationService: new LaunchConfigurationService({
        findCommand: () => Promise.resolve(null),
        apply: () => Promise.reject(new Error("D1 unavailable")),
      }),
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-superadmin",
              userId: "admin-1",
              role: "admin",
              adminPermissions: ["superadmin"],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
              mfaRequired: true,
              mfaVerified: true,
            }),
          ),
      },
    });
    const response = await adminApp.request("/api/v1/admin/launch-configuration", {
      method: "PUT",
      headers: { "content-type": "application/json", "idempotency-key": "launch-1" },
      body: JSON.stringify(launchConfigurationFixture()),
    });

    expect(response.status).toBe(500);
    expect(apiErrorResponseSchema.parse(await response.json())).toMatchObject({
      error: { code: "INTERNAL_ERROR", message: "unexpected server error" },
      meta: { correlationId: "correlation-launch-failure" },
    });
  });

  it("rejects launch configuration writes without superadmin permission", async () => {
    const adminApp = createApi({
      sink: () => undefined,
      launchConfigurationService: new LaunchConfigurationService(
        new InMemoryLaunchConfigurationRepository(),
      ),
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-pricing",
              userId: "pricing-1",
              role: "admin",
              adminPermissions: ["pricing"],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
              mfaRequired: true,
              mfaVerified: true,
            }),
          ),
      },
    });
    const response = await adminApp.request("/api/v1/admin/launch-configuration", {
      method: "PUT",
      headers: { "content-type": "application/json", "idempotency-key": "launch-1" },
      body: JSON.stringify(launchConfigurationFixture()),
    });

    expect(response.status).toBe(403);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe("FORBIDDEN");
  });

  it("creates pending plan changes and requires an independent finance approval", async () => {
    const approvalService = new DefaultPlanApprovalService(
      new InMemoryPlanApprovalRepository(),
      () => "change-1",
    );
    const proposalApp = createApi({
      now: () => new Date("2026-08-18T01:00:00.000Z"),
      sink: () => undefined,
      planApprovalService: approvalService,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-pricing",
              userId: "pricing-1",
              role: "admin",
              adminPermissions: ["pricing", "finance"],
              customerId: null,
              expiresAt: "2026-08-19T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const proposal = await proposalApp.request("/api/v1/admin/plans/plan-small", {
      method: "PUT",
      headers: { "content-type": "application/json", "idempotency-key": "change-1" },
      body: JSON.stringify({
        code: "small",
        name: "Small",
        weeklyFee: { centavos: 70_000, currency: "PHP" },
        weeklyCredit: { centavos: 69_900, currency: "PHP" },
        displayOrder: 10,
        active: true,
      }),
    });
    const proposalBody = planChangeRequestResponseSchema.parse(await proposal.json());

    expect(proposal.status).toBe(202);
    expect(proposalBody.data.status).toBe("pending");

    const selfApproval = await proposalApp.request(
      "/api/v1/admin/plan-change-requests/change-1/decision",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved: true }),
      },
    );
    expect((await apiErrorResponseSchema.parseAsync(await selfApproval.json())).error.code).toBe(
      "INVALID_PLAN_APPROVAL",
    );
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
              expiresAt: "2099-08-21T00:00:00.000Z",
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

  it("changes the authenticated customer's plan for the assigned cycle", async () => {
    const plans = new InMemoryPlanReader();
    const subscriptionService = new DefaultSubscriptionCommandService(
      new InMemorySubscriptionRepository([
        createSubscription({
          id: "subscription-plan-change",
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
      plans,
    );
    const authenticatedApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-plan-change",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
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
        headers: { "content-type": "application/json", "idempotency-key": "change-plan-1" },
        body: JSON.stringify({
          action: "change-plan",
          planId: "plan-medium",
          customerId: "customer-from-browser",
          weeklyFeeCentavos: 1,
        }),
      },
      { APP_ENV: "test" },
    );
    const body = subscriptionResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      customerId: "customer-1",
      planId: "plan-medium",
      effectiveCycleId: assignWeeklyCycle(new Date("2026-08-20T10:00:00.000Z")).id,
    });
  });

  it("creates a server-resolved subscription and replays idempotent retries", async () => {
    const subscriptions = new InMemorySubscriptionRepository();
    const idempotency = new InMemoryIdempotencyStore();
    const plans = new InMemoryPlanReader();
    const lookedUpPlanIds: string[] = [];
    const subscriptionCreationService = new DefaultSubscriptionCreationService(
      subscriptions,
      idempotency,
      {
        findActiveById: (planId) => {
          lookedUpPlanIds.push(planId);
          return plans.findActiveById(planId);
        },
      },
      () => "subscription-created",
    );
    const authenticatedApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-onboarding",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
      subscriptionCreationService,
    });
    const request = {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "onboarding-1" },
      body: JSON.stringify({
        planId: "plan-small",
        customerId: "customer-from-browser",
        weeklyFeeCentavos: 1,
      }),
    };

    const first = await authenticatedApp.request("/api/v1/subscription", request);
    const replay = await authenticatedApp.request("/api/v1/subscription", request);
    const conflict = await authenticatedApp.request("/api/v1/subscription", {
      ...request,
      body: JSON.stringify({ planId: "plan-medium" }),
    });
    const unavailable = await authenticatedApp.request("/api/v1/subscription", {
      ...request,
      headers: { ...request.headers, "idempotency-key": "onboarding-2" },
      body: JSON.stringify({ planId: "plan-unavailable" }),
    });
    const firstBody = subscriptionResponseSchema.parse(await first.json());
    const replayBody = subscriptionResponseSchema.parse(await replay.json());
    const conflictBody = apiErrorResponseSchema.parse(await conflict.json());
    const unavailableBody = apiErrorResponseSchema.parse(await unavailable.json());

    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(firstBody.data).toMatchObject({
      id: "subscription-created",
      customerId: "customer-1",
      planId: "plan-small",
      status: "active",
    });
    expect(replayBody.data).toEqual(firstBody.data);
    expect(conflict.status).toBe(409);
    expect(conflictBody.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(unavailable.status).toBe(409);
    expect(unavailableBody.error.code).toBe("PLAN_UNAVAILABLE");
    expect(lookedUpPlanIds).toEqual(["plan-small", "plan-unavailable"]);
    await expect(subscriptions.findByCustomerId("customer-from-browser")).resolves.toBeNull();
  });

  it("protects procurement and dispatch operations with scoped admin permissions", async () => {
    const cycleId = "cycle-2026-08-22";
    const procurementRepository = new InMemoryProcurementRepository([
      { cycleId, skuId: "sku-1", orderedQuantity: 3, purchasedQuantity: 0, status: "open" },
    ]);
    const dispatchRepository = new InMemoryDispatchRepository();
    const auditEvents: unknown[] = [];
    const operationsApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      procurementRepository,
      dispatchRepository,
      identityRepository: {
        saveAuditEvent: (event: unknown) => {
          auditEvents.push(event);
          return Promise.resolve();
        },
      } as never,
      operationalProjectionRepository: new InMemoryOperationalProjectionRepository({
        outbox: {
          pendingCount: 1,
          oldestPendingAt: "2026-08-20T09:00:00.000Z",
          deadLetteredCount: 0,
        },
        delivery: { totalAssignments: 1, assigned: 1, outForDelivery: 0, delivered: 0, failed: 0 },
        procurement: { openShortages: 1, exceptionalManifests: 0 },
      }),
      deliveryWindowRepository: new InMemoryDeliveryWindowRepository([
        {
          id: "window-1",
          cycleId,
          label: "Morning",
          startsAt: "2026-08-22T00:00:00.000Z",
          endsAt: "2026-08-22T04:00:00.000Z",
          capacity: 10,
          active: true,
          createdAt: "2026-08-19T00:00:00.000Z",
          updatedAt: "2026-08-19T00:00:00.000Z",
        },
      ]),
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-ops",
              userId: "admin-ops",
              role: "admin",
              adminPermissions: ["procurement", "packing", "dispatch", "reporting"],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const purchase = await operationsApp.request("/api/v1/admin/procurement/purchases", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ skuId: "sku-1", purchasedQuantity: 2 }),
    });
    expect(purchase.status).toBe(200);
    const dispatch = await operationsApp.request("/api/v1/admin/dispatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: "order-1",
        windowId: "window-1",
        deliverymanUserId: "driver-1",
      }),
    });
    expect(dispatch.status).toBe(200);
    expect(auditEvents).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "dispatch.assignment-created" })]),
    );
    dispatchResponseSchema.parse(await dispatch.json());
    const projection = await operationsApp.request("/api/v1/admin/operations/projection");
    expect(projection.status).toBe(200);
    const projectionBody = operationalProjectionResponseSchema.parse(await projection.json());
    expect(projectionBody.data.cycleId).toBe(cycleId);
    expect(projectionBody.data.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: `${cycleId}:outbox-stale` }),
        expect.objectContaining({ id: `${cycleId}:procurement-shortages` }),
      ]),
    );

    const deniedApp = createApi({
      sink: () => undefined,
      operationalProjectionRepository: new InMemoryOperationalProjectionRepository(),
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-dispatch",
              userId: "admin-dispatch",
              role: "admin",
              adminPermissions: ["dispatch"],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    expect((await deniedApp.request("/api/v1/admin/operations/projection")).status).toBe(403);
  });

  it("keeps support cases customer-owned, idempotent, and permission-scoped", async () => {
    const repository = new InMemorySupportCaseRepository();
    const customerApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      supportCaseRepository: repository,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-customer",
              userId: "user-customer",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const request = {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "support-1" },
      body: JSON.stringify({ subject: "Missing item", message: "The spinach was not included." }),
    };
    const created = await customerApp.request("/api/v1/support/cases", request);
    const replay = await customerApp.request("/api/v1/support/cases", request);
    expect(created.status).toBe(201);
    expect(replay.status).toBe(200);
    const createdBody = supportCaseResponseSchema.parse(await created.json());
    const replayBody = supportCaseResponseSchema.parse(await replay.json());
    expect(replayBody.data.id).toBe(createdBody.data.id);
    const customerCases = supportCasesResponseSchema.parse(
      await (await customerApp.request("/api/v1/support/cases")).json(),
    );
    expect(customerCases.data.cases).toHaveLength(1);

    const supportApp = createApi({
      sink: () => undefined,
      supportCaseRepository: repository,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-support",
              userId: "admin-support",
              role: "admin",
              adminPermissions: ["support"],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const queue = await supportApp.request("/api/v1/admin/support/cases");
    expect(supportCasesResponseSchema.parse(await queue.json()).data.cases).toHaveLength(1);
    const updated = await supportApp.request(
      `/api/v1/admin/support/cases/${createdBody.data.id}/status`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      },
    );
    expect(supportCaseResponseSchema.parse(await updated.json()).data.status).toBe("resolved");
  });

  it("reads and updates customer-owned notification preferences", async () => {
    const repository = new InMemoryNotificationPreferencesRepository();
    const app = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      notificationPreferencesRepository: repository,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-customer",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const defaults = await app.request("/api/v1/notification-preferences");
    expect(notificationPreferencesResponseSchema.parse(await defaults.json()).data).toMatchObject({
      deliveryUpdates: true,
      marketing: false,
    });
    const updated = await app.request("/api/v1/notification-preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deliveryUpdates: false, marketing: true }),
    });
    expect(notificationPreferencesResponseSchema.parse(await updated.json()).data).toMatchObject({
      customerId: "customer-1",
      deliveryUpdates: false,
      marketing: true,
    });
  });

  it("scopes deliveryman assignments and deduplicates event retries", async () => {
    const repository = new InMemoryDeliveryEventRepository([
      {
        id: "assignment-1",
        cycleId: "cycle-2026-08-22",
        orderId: "order-1",
        windowId: "window-1",
        deliverymanUserId: "driver-1",
        status: "assigned",
        assignedAt: "2026-08-19T00:00:00.000Z",
        lastEventType: null,
        routeSequence: 1,
        recipientName: null,
        recipientPhone: null,
        deliveryAddress: null,
      },
    ]);
    const deliverymanApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      deliveryEventRepository: repository,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-driver",
              userId: "driver-1",
              role: "deliveryman",
              adminPermissions: [],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const assignments = await deliverymanApp.request("/api/v1/deliveryman/assignments");
    expect(assignments.status).toBe(200);
    deliverymanAssignmentsResponseSchema.parse(await assignments.json());
    const request = {
      clientEventId: "client-event-1",
      assignmentId: "assignment-1",
      orderId: "order-1",
      type: "picked_up",
      occurredAt: "2026-08-22T02:00:00.000Z",
    };
    const first = await deliverymanApp.request("/api/v1/deliveryman/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    const second = await deliverymanApp.request("/api/v1/deliveryman/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    deliveryEventResponseSchema.parse(await second.json());
  });

  it("scopes customer tracking and media reads to the active customer", async () => {
    const trackingRepository = new InMemoryDeliveryTrackingRepository([
      {
        orderId: "order-track",
        customerId: "customer-1",
        assignmentId: "assignment-1",
        windowId: "window-1",
        status: "delivered",
        latestEventType: null,
        events: [],
      },
    ]);
    const mediaRepository = new InMemoryDeliveryMediaRepository();
    const customerApp = createApi({
      sink: () => undefined,
      deliveryTrackingRepository: trackingRepository,
      deliveryMediaRepository: mediaRepository,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-customer",
              userId: "user-1",
              role: "customer",
              customerId: "customer-1",
              adminPermissions: [],
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const tracking = await customerApp.request("/api/v1/orders/order-track/tracking");
    expect(tracking.status).toBe(200);
    deliveryTrackingResponseSchema.parse(await tracking.json());
    const media = await customerApp.request("/api/v1/orders/order-track/media");
    expect(media.status).toBe(200);
    deliveryMediaListResponseSchema.parse(await media.json());
    const hidden = await customerApp.request("/api/v1/orders/other-order/tracking");
    expect(hidden.status).toBe(404);
  });

  it("keeps delivery media retries idempotent and rejects conflicting payloads", async () => {
    const now = new Date("2026-08-20T10:00:00.000Z");
    const assignmentRepository = new InMemoryDeliveryEventRepository([
      {
        id: "assignment-media",
        cycleId: assignWeeklyCycle(now).id,
        orderId: "order-media",
        windowId: "window-1",
        deliverymanUserId: "driver-1",
        status: "assigned",
        assignedAt: "2026-08-19T00:00:00.000Z",
        lastEventType: null,
        routeSequence: 1,
        recipientName: null,
        recipientPhone: null,
        deliveryAddress: null,
      },
    ]);
    const mediaRepository = new InMemoryDeliveryMediaRepository();
    const mediaApp = createApi({
      now: () => now,
      sink: () => undefined,
      deliveryEventRepository: assignmentRepository,
      deliveryMediaRepository: mediaRepository,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-driver",
              userId: "driver-1",
              role: "deliveryman",
              customerId: null,
              adminPermissions: [],
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const request = {
      clientMediaId: "client-media-1",
      assignmentId: "assignment-media",
      orderId: "order-media",
      kind: "proof_of_delivery",
      contentType: "image/jpeg",
      sizeBytes: 100,
    };
    const first = await mediaApp.request("/api/v1/deliveryman/media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    const retry = await mediaApp.request("/api/v1/deliveryman/media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    const conflict = await mediaApp.request("/api/v1/deliveryman/media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...request, sizeBytes: 101 }),
    });
    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(conflict.status).toBe(409);
    const firstBody = deliveryMediaUploadResponseSchema.parse(await first.json());
    const retryBody = deliveryMediaUploadResponseSchema.parse(await retry.json());
    expect(retryBody.data.id).toBe(firstBody.data.id);
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
              expiresAt: "2099-08-21T00:00:00.000Z",
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
              expiresAt: "2099-08-21T00:00:00.000Z",
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

  it("reads and updates only the authenticated customer's delivery address", async () => {
    const repository = new InMemoryDeliveryAddressRepository();
    const addressApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      deliveryAddressRepository: repository,
      serviceablePostalCodes: ["1105"],
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const put = await addressApp.request("/api/v1/delivery-address", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipientName: "Maria Santos",
        phone: "+639171234567",
        line1: "12 Green Street",
        barangay: "Bagong Pagasa",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "1105",
      }),
    });
    const putBody = deliveryAddressResponseSchema.parse(await put.json());

    expect(put.status).toBe(200);
    expect(putBody.data).toMatchObject({
      recipientName: "Maria Santos",
      postalCode: "1105",
      updatedAt: "2026-08-20T10:00:00.000Z",
    });
    expect(putBody.data).not.toHaveProperty("customerId");

    const get = await addressApp.request("/api/v1/delivery-address");
    const getBody = deliveryAddressResponseSchema.parse(await get.json());
    expect(get.status).toBe(200);
    expect(getBody.data?.city).toBe("Quezon City");
    expect(getBody.data?.serviceable).toBe(true);

    const unavailable = await addressApp.request("/api/v1/delivery-address", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipientName: "Maria Santos",
        phone: "+639171234567",
        line1: "12 Green Street",
        barangay: "Bagong Pagasa",
        city: "Quezon City",
        province: "Metro Manila",
        postalCode: "9999",
      }),
    });
    const unavailableBody = apiErrorResponseSchema.parse(await unavailable.json());
    expect(unavailable.status).toBe(409);
    expect(unavailableBody.error.code).toBe("DELIVERY_ADDRESS_UNSERVICEABLE");
  });

  it("adds and selects customer-owned saved delivery addresses idempotently", async () => {
    const repository = new InMemoryDeliveryAddressRepository();
    const app = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      deliveryAddressRepository: repository,
      serviceablePostalCodes: ["1105", "1200"],
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-address-book",
              userId: "user-address-book",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-address-book",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
      sink: () => undefined,
    });
    const input = {
      recipientName: "Maria Santos",
      phone: "+639171234567",
      line1: "12 Green Street",
      barangay: "Bagong Pagasa",
      city: "Quezon City",
      province: "Metro Manila",
      postalCode: "1105",
    };
    const first = await app.request("/api/v1/delivery-addresses", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "home" },
      body: JSON.stringify(input),
    });
    expect(first.status).toBe(201);
    const replay = await app.request("/api/v1/delivery-addresses", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "home" },
      body: JSON.stringify(input),
    });
    expect(replay.status).toBe(200);
    await app.request("/api/v1/delivery-addresses", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "office" },
      body: JSON.stringify({ ...input, line1: "8 Office Road", postalCode: "1200" }),
    });
    const list = deliveryAddressesResponseSchema.parse(
      await (await app.request("/api/v1/delivery-addresses")).json(),
    );
    expect(list.data.addresses).toHaveLength(2);
    const office = list.data.addresses.find((address) => address.line1 === "8 Office Road");
    const selected = await app.request(
      `/api/v1/delivery-addresses/${encodeURIComponent(office?.id ?? "")}/select`,
      { method: "PUT", headers: { "content-type": "application/json" }, body: "{}" },
    );
    expect(selected.status).toBe(200);
    await expect(repository.findByCustomerId("customer-address-book")).resolves.toMatchObject({
      line1: "8 Office Road",
    });
  });

  it("lists and selects a current weekly delivery window", async () => {
    const repository = new InMemoryDeliveryWindowRepository([
      {
        id: "window-1",
        cycleId: "cycle-2026-08-22",
        label: "Saturday morning",
        startsAt: "2026-08-22T00:00:00.000Z",
        endsAt: "2026-08-22T04:00:00.000Z",
        capacity: 10,
        active: true,
        createdAt: "2026-08-19T00:00:00.000Z",
        updatedAt: "2026-08-19T00:00:00.000Z",
      },
    ]);
    const windowsApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      deliveryWindowRepository: repository,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const listed = await windowsApp.request("/api/v1/delivery-windows");
    const listedBody = deliveryWindowsResponseSchema.parse(await listed.json());
    expect(listed.status).toBe(200);
    expect(listedBody.data.windows[0]?.remaining).toBe(10);
    const selected = await windowsApp.request("/api/v1/delivery-windows", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ windowId: "window-1" }),
    });
    const selectedBody = deliveryWindowsResponseSchema.parse(await selected.json());
    expect(selected.status).toBe(200);
    expect(selectedBody.data.selectedWindowId).toBe("window-1");
  });

  it("persists customer carts and resolves prices from the catalog", async () => {
    const cartRepository = new InMemoryCartRepository();
    const cartApp = createApi({
      sink: () => undefined,
      cartRepository,
      catalogCheckoutReader: createDefaultCatalogReader(),
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const put = await cartApp.request("/api/v1/cart", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [{ skuId: "sku-bananas", quantity: 2, unitPrice: { centavos: 1, currency: "PHP" } }],
      }),
    });
    const putBody = cartResponseSchema.parse(await put.json());

    expect(put.status).toBe(200);
    expect(putBody.data.lines[0]?.unitPrice.centavos).toBe(12_500);
    expect(putBody.data.subtotal.centavos).toBe(25_000);
    await expect(cartRepository.findByCustomerId("customer-1")).resolves.toMatchObject({
      lines: [{ skuId: "sku-bananas", quantity: 2 }],
    });

    const get = await cartApp.request("/api/v1/cart");
    const getBody = cartResponseSchema.parse(await get.json());
    expect(get.status).toBe(200);
    expect(getBody.data.lines[0]?.unitPrice.centavos).toBe(12_500);
  });

  it("rejects duplicate and unavailable cart SKUs", async () => {
    const cartApp = createApi({
      sink: () => undefined,
      catalogCheckoutReader: createDefaultCatalogReader(),
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const duplicate = await cartApp.request("/api/v1/cart", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lines: [
          { skuId: "sku-bananas", quantity: 1 },
          { skuId: "sku-bananas", quantity: 2 },
        ],
      }),
    });
    expect((await apiErrorResponseSchema.parseAsync(await duplicate.json())).error.code).toBe(
      "DUPLICATE_CART_SKU",
    );

    const unavailable = await cartApp.request("/api/v1/cart", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines: [{ skuId: "sku-missing", quantity: 1 }] }),
    });
    expect((await apiErrorResponseSchema.parseAsync(await unavailable.json())).error.code).toBe(
      "SKU_NOT_AVAILABLE",
    );
  });

  it("locks a customer order using server-side prices, credit, and delivery fee", async () => {
    const orderRepository = new InMemoryOrderRepository();
    const outbox = new InMemoryOutboxPublisher();
    const planLookup = new InMemoryPlanReader();
    const orderApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      deliveryFeeCentavos: 5_000,
      catalogCheckoutReader: createDefaultCatalogReader(),
      planLookup,
      orderLockService: new DefaultCartLockService(orderRepository, outbox, () => "order-1"),
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
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const response = await orderApp.request(
      "/api/v1/orders",
      {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "checkout-1" },
        body: JSON.stringify({
          lines: [
            {
              skuId: "sku-bananas",
              quantity: 2,
              unitPrice: { centavos: 1, currency: "PHP" },
            },
          ],
          totalDue: { centavos: 1, currency: "PHP" },
        }),
      },
      { APP_ENV: "test" },
    );
    const body = orderResponseSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(body.data.cycleId).toBe("cycle-2026-08-22");
    expect(body.data.lines[0]?.unitPrice.centavos).toBe(12_500);
    expect(body.data.totals).toMatchObject({
      subtotal: { centavos: 25_000 },
      includedCredit: { centavos: 25_000 },
      overage: { centavos: 0 },
      deliveryFee: { centavos: 5_000 },
      totalDue: { centavos: 74_900 },
    });
    expect(outbox.events).toHaveLength(1);
  });

  it("rejects unavailable SKUs before locking an order", async () => {
    const orderApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      catalogCheckoutReader: createDefaultCatalogReader(),
      planLookup: new InMemoryPlanReader(),
      orderLockService: new DefaultCartLockService(
        new InMemoryOrderRepository(),
        new InMemoryOutboxPublisher(),
      ),
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
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const response = await orderApp.request("/api/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "checkout-1" },
      body: JSON.stringify({ lines: [{ skuId: "sku-missing", quantity: 1 }] }),
    });
    const body = apiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("SKU_NOT_AVAILABLE");
  });

  it("requires a saved serviceable delivery address before locking an order", async () => {
    const orderApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      deliveryAddressRepository: new InMemoryDeliveryAddressRepository(),
      serviceablePostalCodes: ["1105"],
      catalogCheckoutReader: createDefaultCatalogReader(),
      planLookup: new InMemoryPlanReader(),
      orderLockService: new DefaultCartLockService(
        new InMemoryOrderRepository(),
        new InMemoryOutboxPublisher(),
      ),
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
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const response = await orderApp.request("/api/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "checkout-address" },
      body: JSON.stringify({ lines: [{ skuId: "sku-bananas", quantity: 1 }] }),
    });
    const body = apiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("DELIVERY_ADDRESS_REQUIRED");
  });

  it("locks a saved cart when order lines are omitted and clears it after success", async () => {
    const cartRepository = new InMemoryCartRepository();
    await cartRepository.save({
      customerId: "customer-1",
      lines: [{ skuId: "sku-bananas", quantity: 1 }],
      updatedAt: "2026-08-20T00:00:00.000Z",
    });
    const orderApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      cartRepository,
      catalogCheckoutReader: createDefaultCatalogReader(),
      planLookup: new InMemoryPlanReader(),
      orderLockService: new DefaultCartLockService(
        new InMemoryOrderRepository(),
        new InMemoryOutboxPublisher(),
        () => "order-saved-cart",
      ),
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
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const response = await orderApp.request("/api/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "checkout-saved-cart" },
      body: JSON.stringify({}),
    });
    const body = orderResponseSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(body.data.lines[0]?.unitPrice.centavos).toBe(12_500);
    await expect(cartRepository.findByCustomerId("customer-1")).resolves.toBeNull();
  });

  it("rejects a saved cart after cutoff without clearing it", async () => {
    const cartRepository = new InMemoryCartRepository();
    await cartRepository.save({
      customerId: "customer-1",
      lines: [{ skuId: "sku-bananas", quantity: 1 }],
      updatedAt: "2026-08-21T09:00:00.000Z",
    });
    const orderApp = createApi({
      now: () => new Date("2026-08-21T10:00:00.000Z"),
      sink: () => undefined,
      cartRepository,
      catalogCheckoutReader: createDefaultCatalogReader(),
      planLookup: new InMemoryPlanReader(),
      orderLockService: new DefaultCartLockService(
        new InMemoryOrderRepository(),
        new InMemoryOutboxPublisher(),
      ),
      subscriptionReader: new InMemorySubscriptionReader(),
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-22T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });

    const response = await orderApp.request("/api/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "checkout-cutoff" },
      body: JSON.stringify({}),
    });
    const body = apiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("ORDER_CUTOFF_PASSED");
    expect(body.error.message).toContain("cycle-2026-08-22");
    await expect(cartRepository.findByCustomerId("customer-1")).resolves.toMatchObject({
      customerId: "customer-1",
    });
  });

  it("charges a locked order using its server-side total and accepts signed webhooks", async () => {
    const orderRepository = new InMemoryOrderRepository();
    await orderRepository.save(
      createLockedOrder({
        id: "order-payment-1",
        customerId: "customer-1",
        subscriptionId: "subscription-1",
        planId: "plan-small",
        cycleId: "cycle-2026-08-22",
        idempotencyKey: "checkout-payment-1",
        requestFingerprint: "order-fingerprint-1",
        cart: createCart([
          createCartLine({
            skuId: "sku-bananas",
            quantity: 1,
            unitPrice: createMoney(12_500),
          }),
        ]),
        weeklyCredit: createMoney(69_900),
        totals: {
          subtotal: createMoney(12_500),
          weeklyFee: createMoney(69_900),
          includedCredit: createMoney(12_500),
          overage: createMoney(0),
          deliveryFee: createMoney(5_000),
          totalDue: createMoney(74_900),
        },
        status: "locked",
        lockedAt: "2026-08-20T10:00:00.000Z",
      }),
    );
    const paymentRepository = new InMemoryPaymentRepository();
    const paymentProvider = new FakePaymentProvider({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
    });
    const paymentService = new DefaultPaymentService(
      paymentRepository,
      paymentProvider,
      () => "attempt-api-1",
    );
    const paymentApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      orderReader: orderRepository,
      paymentProvider,
      paymentService,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-1",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });

    const charge = await paymentApp.request("/api/v1/payments/charge", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "charge-api-1" },
      body: JSON.stringify({
        orderId: "order-payment-1",
        customerReference: "provider-customer-1",
        paymentMethodReference: "provider-method-1",
      }),
    });
    const chargeBody = paymentAttemptResponseSchema.parse(await charge.json());

    expect(charge.status).toBe(200);
    expect(chargeBody.data.amount.centavos).toBe(74_900);
    expect(chargeBody.data.providerReference).toBe("fake-charge-attempt-api-1");

    const rawWebhook = JSON.stringify({
      id: "event-api-1",
      type: "charge.succeeded",
      occurredAt: "2026-08-20T10:01:00.000Z",
      data: { chargeReference: chargeBody.data.providerReference },
    });
    const webhook = await paymentApp.request("/api/v1/payments/webhooks/fake", {
      method: "POST",
      headers: { "content-type": "application/json", "x-payment-signature": "fake:event-api-1" },
      body: rawWebhook,
    });
    const webhookBody = paymentWebhookResponseSchema.parse(await webhook.json());

    expect(webhook.status).toBe(200);
    expect(webhookBody.data).toEqual({ duplicate: false, applied: true });
  });

  it("registers customer payment methods with provider-only token handling", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    const paymentProvider = new FakePaymentProvider({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
    });
    const paymentService = new DefaultPaymentService(paymentRepository, paymentProvider);
    const paymentApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      paymentProvider,
      paymentService,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-payment-method",
              userId: "user-1",
              role: "customer",
              adminPermissions: [],
              customerId: "customer-1",
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });

    const response = await paymentApp.request("/api/v1/payments/methods", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "method-api-1" },
      body: JSON.stringify({
        customerReference: "provider-customer-1",
        type: "card",
        token: "tok_private_123",
      }),
    });
    const body = paymentMethodResponseSchema.parse(await response.json());

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      providerReference: "fake-payment-method-method-api-1",
      type: "card",
      status: "active",
    });
    expect(JSON.stringify(body)).not.toContain("tok_private_123");

    const list = await paymentApp.request("/api/v1/payments/methods");
    const listBody = paymentMethodListResponseSchema.parse(await list.json());

    expect(list.status).toBe(200);
    expect(listBody.data.methods).toMatchObject([
      { id: body.data.id, providerReference: body.data.providerReference, status: "active" },
    ]);

    const replay = await paymentApp.request("/api/v1/payments/methods", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "method-api-1" },
      body: JSON.stringify({
        customerReference: "provider-customer-1",
        type: "card",
        token: "tok_private_123",
      }),
    });
    const replayBody = paymentMethodResponseSchema.parse(await replay.json());

    expect(replay.status).toBe(201);
    expect(replayBody.data.id).toBe(body.data.id);
    await expect(paymentRepository.listPaymentMethods("customer-1")).resolves.toHaveLength(1);

    const revoked = await paymentApp.request(`/api/v1/payments/methods/${body.data.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json", "idempotency-key": "revoke-api-1" },
      body: JSON.stringify({ customerReference: "provider-customer-1" }),
    });
    const revokedJson: unknown = await revoked.json();

    expect(revoked.status).toBe(200);
    const revokedBody = paymentMethodResponseSchema.parse(revokedJson);
    expect(revokedBody.data.status).toBe("revoked");
    const revokeReplay = await paymentApp.request(`/api/v1/payments/methods/${body.data.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json", "idempotency-key": "revoke-api-1" },
      body: JSON.stringify({ customerReference: "provider-customer-1" }),
    });
    expect(revokeReplay.status).toBe(200);
    const emptyList = await paymentApp.request("/api/v1/payments/methods");
    expect(paymentMethodListResponseSchema.parse(await emptyList.json()).data.methods).toEqual([]);
  });

  it("allows finance admins to refund a successful payment and records the ledger entry", async () => {
    const paymentRepository = new InMemoryPaymentRepository();
    const paymentProvider = new FakePaymentProvider({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
    });
    const paymentService = new DefaultPaymentService(
      paymentRepository,
      paymentProvider,
      () => "attempt-refund-api-1",
    );
    const auditEvents: unknown[] = [];
    const attempt = await paymentService.charge({
      customerId: "customer-1",
      orderId: "order-refund-1",
      customerReference: "provider-customer-1",
      paymentMethodReference: "provider-method-1",
      amount: createMoney(74_900),
      idempotencyKey: "charge-refund-api-1",
      now: "2026-08-20T10:00:00.000Z",
    });
    const adminApp = createApi({
      now: () => new Date("2026-08-20T10:02:00.000Z"),
      sink: () => undefined,
      paymentService,
      paymentProvider,
      identityRepository: {
        saveAuditEvent: (event: unknown) => {
          auditEvents.push(event);
          return Promise.resolve();
        },
      } as never,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-finance",
              userId: "admin-1",
              role: "admin",
              adminPermissions: ["finance"],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });

    const response = await adminApp.request("/api/v1/admin/payments/refunds", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "refund-api-1" },
      body: JSON.stringify({
        customerId: "customer-1",
        paymentAttemptId: attempt.id,
        amount: { centavos: 10_000, currency: "PHP" },
        reason: "approved customer refund",
      }),
    });
    const body = paymentRefundResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      customerId: "customer-1",
      paymentAttemptId: attempt.id,
      amount: { centavos: 10_000, currency: "PHP" },
      status: "succeeded",
      reason: "approved customer refund",
    });
    expect(paymentRepository.ledgerEntries).toHaveLength(2);
    expect(paymentRepository.ledgerEntries.map((entry) => entry.type)).toEqual([
      "charge",
      "refund",
    ]);
    expect(auditEvents).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: "payment.refunded" })]),
    );

    const replay = await adminApp.request("/api/v1/admin/payments/refunds", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "refund-api-1" },
      body: JSON.stringify({
        customerId: "customer-1",
        paymentAttemptId: attempt.id,
        amount: { centavos: 10_000, currency: "PHP" },
        reason: "approved customer refund",
      }),
    });
    const replayBody = paymentRefundResponseSchema.parse(await replay.json());

    expect(replay.status).toBe(200);
    expect(replayBody.data.id).toBe(body.data.id);
    expect(paymentRepository.ledgerEntries).toHaveLength(2);

    const missingKey = await adminApp.request("/api/v1/admin/payments/refunds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId: "customer-1",
        paymentAttemptId: attempt.id,
        amount: { centavos: 10_000, currency: "PHP" },
        reason: "approved customer refund",
      }),
    });
    const missingKeyBody = apiErrorResponseSchema.parse(await missingKey.json());

    expect(missingKey.status).toBe(400);
    expect(missingKeyBody.error.code).toBe("MISSING_IDEMPOTENCY_KEY");
  });

  it("requires finance permission for payment refunds", async () => {
    const paymentProvider = new FakePaymentProvider();
    const adminApp = createApi({
      sink: () => undefined,
      paymentService: new DefaultPaymentService(new InMemoryPaymentRepository(), paymentProvider),
      paymentProvider,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-catalog-admin",
              userId: "admin-2",
              role: "admin",
              adminPermissions: ["catalog"],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });

    const response = await adminApp.request("/api/v1/admin/payments/refunds", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "refund-api-2" },
      body: JSON.stringify({
        customerId: "customer-1",
        paymentAttemptId: "attempt-1",
        amount: { centavos: 1_000, currency: "PHP" },
        reason: "approved customer refund",
      }),
    });
    const body = apiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
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

  it("requires a configured trusted origin for production mutations", async () => {
    const response = await app.request(
      "/api/v1/cart",
      { method: "PUT", headers: { "content-type": "application/json" }, body: '{"lines":[]}' },
      { APP_ENV: "production", CORS_ORIGINS: "https://app.example.test" },
    );
    const body = apiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  it("accepts same-origin production mutations and exempts provider webhooks", async () => {
    const mutation = await app.request(
      "/api/v1/cart",
      {
        method: "PUT",
        headers: {
          origin: "https://app.example.test",
          "content-type": "application/json",
        },
        body: '{"lines":[]}',
      },
      { APP_ENV: "production", CORS_ORIGINS: "https://app.example.test" },
    );
    const webhook = await app.request(
      "/api/v1/payments/webhooks/test",
      { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      { APP_ENV: "production" },
    );

    expect(mutation.status).not.toBe(403);
    expect(webhook.status).not.toBe(403);
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

  it("requires server-resolved MFA for administrator routes", async () => {
    const mfaApp = createApi({
      sink: () => undefined,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-admin-mfa",
              userId: "admin-1",
              role: "admin",
              adminPermissions: ["reporting"],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
              mfaRequired: true,
              mfaVerified: false,
            }),
          ),
      },
    });
    const response = await mfaApp.request("/api/v1/admin/operations/projection");
    const body = apiErrorResponseSchema.parse(await response.json());

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("MFA_REQUIRED");
  });

  it("allows an MFA-verified superadmin to assign audited server-owned roles", async () => {
    const calls: string[] = [];
    const repository = {
      findUser: () => Promise.resolve(null),
      updateUserName: () => Promise.resolve(),
      listSessions: () => Promise.resolve([]),
      revokeSession: () => Promise.resolve(),
      revokeAllSessions: () => Promise.resolve(),
      listConsents: () => Promise.resolve([]),
      saveConsent: () => Promise.resolve(),
      saveAuditEvent: (event: { action: string }) => {
        calls.push(event.action);
        return Promise.resolve();
      },
      findDeletionBlockingReasons: () => Promise.resolve([]),
      findCommandResult: () => Promise.resolve(null),
      saveCommandResult: () => Promise.resolve(),
      findRoleAssignment: () => Promise.resolve(null),
      saveRoleAssignment: (
        _assignment: unknown,
        _customerId: string | null,
        mfaRequired: boolean,
      ) => {
        calls.push(`mfa:${mfaRequired}`);
        return Promise.resolve();
      },
    };
    const adminApp = createApi({
      identityRepository: repository,
      sink: () => undefined,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-superadmin",
              userId: "admin-1",
              role: "admin",
              adminPermissions: ["superadmin"],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
              mfaRequired: true,
              mfaVerified: true,
            }),
          ),
      },
    });
    const response = await adminApp.request("/api/v1/admin/identity/roles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "admin-2", role: "admin", adminPermissions: ["finance"] }),
    });

    expect(response.status).toBe(200);
    expect(calls).toEqual(["mfa:true", "identity.role-assigned"]);
  });

  it("creates, finance-publishes, and publicly filters promotion banners", async () => {
    const repository = new InMemoryPromotionBannerRepository();
    const session = (permissions: readonly ("marketing" | "finance")[]) => ({
      resolve: () =>
        Promise.resolve(
          createSession({
            id: `session-${permissions.join("-")}`,
            userId: `admin-${permissions[0]}`,
            role: "admin",
            adminPermissions: [...permissions],
            customerId: null,
            expiresAt: "2099-08-21T00:00:00.000Z",
            revokedAt: null,
            mfaRequired: true,
            mfaVerified: true,
          }),
        ),
    });
    const marketingApp = createApi({
      promotionBannerRepository: repository,
      sessionResolver: session(["marketing"]),
      sink: () => undefined,
      now: () => new Date("2026-08-20T12:00:00.000Z"),
    });
    const upload = await marketingApp.request("/api/v1/admin/promotion-media/uploads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        bannerId: "banner-client-1",
        variant: "desktop",
        contentType: "image/webp",
        sizeBytes: 120000,
        width: 1600,
        height: 800,
      }),
    });
    expect(upload.status).toBe(201);
    expect(promotionMediaUploadResponseSchema.parse(await upload.json()).data.objectKey).toMatch(
      /^promotions\//,
    );
    const create = await marketingApp.request("/api/v1/admin/promotion-banners", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        placement: "home-hero",
        title: "Fresh week",
        copy: "Seasonal produce",
        ctaLabel: "Shop",
        ctaDestination: "/#plans",
        altText: "Fresh vegetables",
        priority: 10,
        startsAt: "2026-08-20T00:00:00.000Z",
        endsAt: "2026-08-30T00:00:00.000Z",
        desktopObjectKey: "promotions/banner-client-1/desktop/image.webp",
        mobileObjectKey: "promotions/banner-client-1/mobile/image.webp",
      }),
    });
    expect(create.status).toBe(201);
    const banner = promotionBannerResponseSchema.parse(await create.json()).data;
    expect(banner.status).toBe("draft");
    expect(
      (
        await marketingApp.request(`/api/v1/admin/promotion-banners/${banner.id}/status`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        })
      ).status,
    ).toBe(403);

    const financeApp = createApi({
      promotionBannerRepository: repository,
      sessionResolver: session(["finance"]),
      sink: () => undefined,
      now: () => new Date("2026-08-20T12:00:00.000Z"),
    });
    expect(
      (
        await financeApp.request(`/api/v1/admin/promotion-banners/${banner.id}/status`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "active" }),
        })
      ).status,
    ).toBe(200);
    const publicApp = createApi({
      promotionBannerRepository: repository,
      sink: () => undefined,
      now: () => new Date("2026-08-20T12:00:00.000Z"),
    });
    const response = await publicApp.request("/api/v1/promotions/banners?placement=home-hero");
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe('W/"banners-2"');
    const publicBody = activePromotionBannersResponseSchema.parse(await response.json());
    expect(publicBody.data.banners).toHaveLength(1);
    expect(publicBody.data.banners[0]?.id).toBe(banner.id);
    expect(publicBody.data.banners[0]?.desktopUrl).toContain("/promotions/download/");
  });

  it("limits audit history to reporting administrators", async () => {
    const auditEventReader = {
      listAuditEvents: (limit: number) =>
        Promise.resolve(
          [
            {
              id: "audit-1",
              actorUserId: "admin-1",
              action: "payment.refunded",
              targetType: "payment",
              targetId: "attempt-1",
              occurredAt: "2026-08-20T12:00:00.000Z",
              metadata: { reason: "approved" },
            },
          ].slice(0, limit),
        ),
    };
    const auditApp = createApi({
      auditEventReader,
      sink: () => undefined,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-reporting",
              userId: "admin-1",
              role: "admin",
              adminPermissions: ["reporting"],
              customerId: null,
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
    });
    const response = await auditApp.request("/api/v1/admin/audit?limit=1");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { events: [{ id: "audit-1" }] },
    });
  });

  it("accepts customer-owned idempotent cancellation and refund requests only when eligible", async () => {
    const requestRepository = new InMemoryCustomerOrderRequestRepository();
    const order = createLockedOrder({
      id: "order-request-1",
      customerId: "customer-request-1",
      subscriptionId: "subscription-1",
      planId: "plan-small",
      cycleId: "cycle-2026-08-22",
      idempotencyKey: "checkout-request-1",
      requestFingerprint: "fingerprint-request-1",
      cart: createCart([
        createCartLine({ skuId: "sku-a", quantity: 1, unitPrice: createMoney(100) }),
      ]),
      weeklyCredit: createMoney(100),
      totals: {
        subtotal: createMoney(100),
        weeklyFee: createMoney(0),
        includedCredit: createMoney(100),
        overage: createMoney(0),
        deliveryFee: createMoney(0),
        totalDue: createMoney(100),
      },
      paymentState: "paid",
      status: "locked",
      lockedAt: "2026-08-18T00:00:00.000Z",
    });
    const orderReader = new InMemoryOrderRepository();
    await orderReader.save(order);
    const app = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      customerOrderRequestRepository: requestRepository,
      orderReader,
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-request",
              userId: "user-request",
              role: "customer",
              customerId: "customer-request-1",
              adminPermissions: [],
              expiresAt: "2099-08-21T00:00:00.000Z",
              revokedAt: null,
            }),
          ),
      },
      sink: () => undefined,
    });
    const input = {
      orderId: order.id,
      kind: "refund" as const,
      reason: "The delivered items were damaged",
    };
    const first = await app.request("/api/v1/order-requests", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "request-1" },
      body: JSON.stringify(input),
    });
    expect(first.status).toBe(201);
    const created = customerOrderRequestResponseSchema.parse(await first.json());
    const replay = await app.request("/api/v1/order-requests", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "request-1" },
      body: JSON.stringify(input),
    });
    expect(replay.status).toBe(200);
    expect(customerOrderRequestResponseSchema.parse(await replay.json()).data.id).toBe(
      created.data.id,
    );
    const list = await app.request("/api/v1/order-requests");
    expect(customerOrderRequestsResponseSchema.parse(await list.json()).data.requests).toHaveLength(
      1,
    );
  });

  it("lets support approve a cancellation into durable canceled order history", async () => {
    const requestRepository = new InMemoryCustomerOrderRequestRepository();
    const orderRepository = new InMemoryOrderRepository();
    await orderRepository.save(
      createLockedOrder({
        id: "order-cancel-1",
        customerId: "customer-cancel-1",
        subscriptionId: "subscription-1",
        planId: "plan-small",
        cycleId: "cycle-2026-08-22",
        idempotencyKey: "checkout-cancel-1",
        requestFingerprint: "fingerprint-cancel-1",
        cart: createCart([
          createCartLine({ skuId: "sku-a", quantity: 1, unitPrice: createMoney(100) }),
        ]),
        weeklyCredit: createMoney(100),
        totals: {
          subtotal: createMoney(100),
          weeklyFee: createMoney(0),
          includedCredit: createMoney(100),
          overage: createMoney(0),
          deliveryFee: createMoney(0),
          totalDue: createMoney(100),
        },
        paymentState: "unpaid",
        status: "locked",
        lockedAt: "2026-08-18T00:00:00.000Z",
      }),
    );
    let session = createSession({
      id: "session-cancel-customer",
      userId: "user-cancel",
      role: "customer",
      customerId: "customer-cancel-1",
      adminPermissions: [],
      expiresAt: "2099-08-21T00:00:00.000Z",
      revokedAt: null,
    });
    const app = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      customerOrderRequestRepository: requestRepository,
      orderReader: orderRepository,
      sessionResolver: { resolve: () => Promise.resolve(session) },
      sink: () => undefined,
    });
    const createdResponse = await app.request("/api/v1/order-requests", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "cancel-request-1" },
      body: JSON.stringify({
        orderId: "order-cancel-1",
        kind: "cancellation",
        reason: "No longer needed",
      }),
    });
    const created = customerOrderRequestResponseSchema.parse(await createdResponse.json());
    session = createSession({
      id: "session-cancel-admin",
      userId: "admin-cancel",
      role: "admin",
      customerId: null,
      adminPermissions: ["support"],
      expiresAt: "2099-08-21T00:00:00.000Z",
      revokedAt: null,
    });
    const decision = await app.request(`/api/v1/admin/order-requests/${created.data.id}/decision`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": `order-request:${created.data.id}:approve`,
      },
      body: JSON.stringify({ decision: "approve" }),
    });
    expect(decision.status).toBe(200);
    expect(customerOrderRequestResponseSchema.parse(await decision.json()).data.status).toBe(
      "completed",
    );
    await expect(orderRepository.listByCustomer("customer-cancel-1")).resolves.toMatchObject([
      { id: "order-cancel-1", status: "canceled" },
    ]);
    await expect(orderRepository.findById("order-cancel-1")).resolves.toBeNull();
  });

  it("lets only the affected customer decide a proposed order substitution idempotently", async () => {
    const procurementRepository = new InMemoryProcurementRepository();
    await procurementRepository.saveShortage({
      id: "shortage-customer-1",
      cycleId: "cycle-2026-08-22",
      skuId: "sku-a",
      requestedQuantity: 2,
      availableQuantity: 1,
      status: "open",
      createdAt: "2026-08-20T00:00:00.000Z",
    });
    const customerSubstitutionRepository = new InMemoryCustomerOrderSubstitutionRepository();
    const orderReader = new InMemoryOrderRepository();
    await orderReader.save(
      createLockedOrder({
        id: "order-substitution-1",
        customerId: "customer-substitution-1",
        subscriptionId: "subscription-1",
        planId: "plan-small",
        cycleId: "cycle-2026-08-22",
        idempotencyKey: "checkout-substitution-1",
        requestFingerprint: "fingerprint-substitution-1",
        cart: createCart([
          createCartLine({ skuId: "sku-a", quantity: 1, unitPrice: createMoney(100) }),
        ]),
        weeklyCredit: createMoney(100),
        totals: {
          subtotal: createMoney(100),
          weeklyFee: createMoney(0),
          includedCredit: createMoney(100),
          overage: createMoney(0),
          deliveryFee: createMoney(0),
          totalDue: createMoney(0),
        },
        status: "locked",
        lockedAt: "2026-08-20T00:00:00.000Z",
      }),
    );
    let activeSession = createSession({
      id: "session-substitution-admin",
      userId: "admin-substitution-1",
      role: "admin",
      customerId: null,
      adminPermissions: ["procurement"],
      expiresAt: "2099-08-21T00:00:00.000Z",
      revokedAt: null,
    });
    const app = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      procurementRepository,
      customerOrderSubstitutionRepository: customerSubstitutionRepository,
      orderReader,
      sessionResolver: { resolve: () => Promise.resolve(activeSession) },
      sink: () => undefined,
    });
    const proposal = await app.request("/api/v1/admin/procurement/substitutions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        shortageId: "shortage-customer-1",
        orderId: "order-substitution-1",
        substituteSkuId: "sku-b",
        quantity: 1,
        status: "proposed",
      }),
    });
    expect(proposal.status).toBe(200);

    activeSession = createSession({
      id: "session-substitution-customer",
      userId: "user-substitution-1",
      role: "customer",
      customerId: "customer-substitution-1",
      adminPermissions: [],
      expiresAt: "2099-08-21T00:00:00.000Z",
      revokedAt: null,
    });
    const list = await app.request("/api/v1/order-substitutions");
    const listBody = customerOrderSubstitutionsResponseSchema.parse(await list.json());
    expect(listBody.data.substitutions).toHaveLength(1);
    const substitutionId = listBody.data.substitutions[0]?.id ?? "";
    const decision = await app.request(`/api/v1/order-substitutions/${substitutionId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "decision-1" },
      body: JSON.stringify({ decision: "accept" }),
    });
    expect(decision.status).toBe(200);
    expect(customerOrderSubstitutionResponseSchema.parse(await decision.json()).data.status).toBe(
      "accepted",
    );
    const replay = await app.request(`/api/v1/order-substitutions/${substitutionId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "decision-1" },
      body: JSON.stringify({ decision: "accept" }),
    });
    expect(replay.status).toBe(200);
    await expect(
      procurementRepository.listSubstitutions("cycle-2026-08-22"),
    ).resolves.toMatchObject([{ status: "approved" }]);
  });
});

function launchConfigurationFixture() {
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
