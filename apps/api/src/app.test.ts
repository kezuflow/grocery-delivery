import { describe, expect, it } from "vitest";

import {
  apiErrorResponseSchema,
  cartResponseSchema,
  catalogListResponseSchema,
  currentSessionResponseSchema,
  deliveryAddressResponseSchema,
  deliveryWindowsResponseSchema,
  dispatchResponseSchema,
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
} from "@carbon/contracts";
import {
  DefaultCartLockService,
  DefaultPlanApprovalService,
  DefaultSubscriptionCommandService,
  InMemoryPlanApprovalRepository,
  InMemoryIdempotencyStore,
  InMemoryOrderRepository,
  InMemoryOutboxPublisher,
  InMemorySubscriptionRepository,
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
} from "@carbon/db";
import { createApi } from "./app.js";

describe("API worker", () => {
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

  it("protects procurement and dispatch operations with scoped admin permissions", async () => {
    const cycleId = "cycle-2026-08-22";
    const procurementRepository = new InMemoryProcurementRepository([
      { cycleId, skuId: "sku-1", orderedQuantity: 3, purchasedQuantity: 0, status: "open" },
    ]);
    const dispatchRepository = new InMemoryDispatchRepository();
    const operationsApp = createApi({
      now: () => new Date("2026-08-20T10:00:00.000Z"),
      sink: () => undefined,
      procurementRepository,
      dispatchRepository,
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
              adminPermissions: ["procurement", "packing", "dispatch"],
              customerId: null,
              expiresAt: "2026-08-21T00:00:00.000Z",
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
    dispatchResponseSchema.parse(await dispatch.json());
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
      type: "delivered",
      occurredAt: "2026-08-22T04:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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

  it("charges a locked order using its server-side total and accepts signed webhooks", async () => {
    const orderRepository = new InMemoryOrderRepository();
    await orderRepository.save(
      createLockedOrder({
        id: "order-payment-1",
        customerId: "customer-1",
        subscriptionId: "subscription-1",
        planId: "plan-small",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
      sessionResolver: {
        resolve: () =>
          Promise.resolve(
            createSession({
              id: "session-finance",
              userId: "admin-1",
              role: "admin",
              adminPermissions: ["finance"],
              customerId: null,
              expiresAt: "2026-08-21T00:00:00.000Z",
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
              expiresAt: "2026-08-21T00:00:00.000Z",
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
