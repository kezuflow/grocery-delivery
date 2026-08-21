import { createServer } from "node:http";

const timestamp = "2026-08-22T01:00:00.000Z";
const meta = { correlationId: "e2e-correlation" };
const money = (centavos) => ({ centavos, currency: "PHP" });

const sessions = {
  customer: {
    sessionId: "session-customer",
    userId: "user-customer",
    role: "customer",
    adminPermissions: [],
    customerId: "customer-1",
    expiresAt: "2027-08-22T01:00:00.000Z",
  },
  admin: {
    sessionId: "session-admin",
    userId: "user-admin",
    role: "admin",
    adminPermissions: [
      "catalog",
      "pricing",
      "marketing",
      "finance",
      "procurement",
      "packing",
      "dispatch",
      "support",
      "reporting",
      "staff",
      "superadmin",
    ],
    customerId: null,
    expiresAt: "2027-08-22T01:00:00.000Z",
  },
  deliveryman: {
    sessionId: "session-deliveryman",
    userId: "user-deliveryman",
    role: "deliveryman",
    adminPermissions: [],
    customerId: null,
    expiresAt: "2027-08-22T01:00:00.000Z",
  },
};

const catalog = {
  categories: [
    { id: "fresh", name: "Fresh produce", slug: "fresh-produce", active: true },
    { id: "pantry", name: "Pantry", slug: "pantry", active: true },
  ],
  items: [
    {
      id: "sku-tomato",
      categoryId: "fresh",
      name: "Roma tomatoes",
      slug: "roma-tomatoes",
      description: "Ripe tomatoes for salads and sauces.",
      unit: "kilogram",
      imageUrl: null,
      price: money(18000),
      active: true,
    },
    {
      id: "sku-oats",
      categoryId: "pantry",
      name: "Rolled oats",
      slug: "rolled-oats",
      description: "A practical breakfast staple.",
      unit: "pack",
      imageUrl: null,
      price: money(25000),
      active: true,
    },
  ],
  nextCursor: null,
};

const cart = {
  lines: [{ skuId: "sku-tomato", quantity: 2, unitPrice: money(18000) }],
  subtotal: money(36000),
  updatedAt: timestamp,
};
const address = {
  id: "address-1",
  recipientName: "Ada Customer",
  phone: "+639171234567",
  line1: "10 Market Street",
  line2: null,
  barangay: "San Antonio",
  city: "Makati",
  province: "Metro Manila",
  postalCode: "1203",
  instructions: "Call on arrival",
  serviceable: true,
  selected: true,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const windows = {
  cycleId: "cycle-2026-34",
  cutoffAt: "2026-08-28T04:00:00.000Z",
  windows: [
    {
      id: "window-morning",
      cycleId: "cycle-2026-34",
      label: "Saturday 9:00 AM - 12:00 PM",
      startsAt: "2026-08-29T01:00:00.000Z",
      endsAt: "2026-08-29T04:00:00.000Z",
      capacity: 20,
      reserved: 8,
      remaining: 12,
      active: true,
    },
  ],
  selectedWindowId: "window-morning",
};
const assignment = {
  id: "assignment-1",
  cycleId: "cycle-2026-34",
  orderId: "order-1",
  windowId: "window-morning",
  deliverymanUserId: "user-deliveryman",
  status: "out_for_delivery",
  assignedAt: timestamp,
  lastEventType: "arrived",
  routeSequence: 1,
  recipientName: "Ada Customer",
  recipientPhone: "+639171234567",
  deliveryAddress: {
    line1: address.line1,
    line2: null,
    barangay: address.barangay,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    instructions: address.instructions,
  },
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:8790");
  const role = readRole(request.headers.cookie);
  const body = await readBody(request);
  const payload = routeResponse(request.method ?? "GET", url, role, body);
  response.statusCode = payload.status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(payload.body));
});

server.listen(8790, "127.0.0.1");

function routeResponse(method, url, role, body) {
  if (url.pathname === "/api/v1/me") {
    return role ? ok(sessions[role]) : error(401, "UNAUTHORIZED", "an active session is required");
  }
  if (url.pathname === "/api/v1/plans")
    return ok({
      plans: [
        {
          id: "plan-family",
          code: "family",
          name: "Family weekly",
          weeklyFee: money(19900),
          weeklyCredit: money(150000),
          displayOrder: 1,
          active: true,
        },
      ],
    });
  if (url.pathname === "/api/v1/catalog") return ok(catalog);
  if (url.pathname === "/api/v1/promotion-banners/active")
    return ok({
      placement: url.searchParams.get("placement") ?? "home-hero",
      banners: [],
      cacheVersion: 1,
    });
  if (url.pathname === "/api/v1/cart") return requireRole(role, "customer", () => ok(cart));
  if (url.pathname === "/api/v1/subscription")
    return requireRole(role, "customer", () =>
      ok({
        id: "subscription-1",
        customerId: "customer-1",
        planId: "plan-family",
        status: "active",
        billingStatus: "current",
        effectiveCycleId: "cycle-2026-34",
        skippedCycleId: null,
        lastAction: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    );
  if (url.pathname === "/api/v1/delivery-address")
    return requireRole(role, "customer", () => ok(address));
  if (url.pathname === "/api/v1/delivery-addresses")
    return requireRole(role, "customer", () => ok({ addresses: [address] }));
  if (url.pathname === "/api/v1/delivery-windows")
    return requireRole(role, "customer", () => ok(windows));
  if (url.pathname === "/api/v1/payments/history")
    return requireRole(role, "customer", () => ok({ entries: [] }));
  if (url.pathname === "/api/v1/payments/methods")
    return requireRole(role, "customer", () =>
      ok({
        methods: [
          {
            id: "method-1",
            providerReference: "pm-fixture",
            type: "card",
            status: "active",
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }),
    );
  if (url.pathname === "/api/v1/orders")
    return requireRole(role, "customer", () => ok({ orders: [] }));
  if (url.pathname === "/api/v1/order-requests")
    return requireRole(role, "customer", () => ok({ requests: [] }));
  if (url.pathname === "/api/v1/order-substitutions")
    return requireRole(role, "customer", () => ok({ substitutions: [] }));
  if (url.pathname === "/api/v1/support/cases")
    return requireRole(role, "customer", () => ok({ cases: [] }));
  if (url.pathname === "/api/v1/notification-preferences")
    return requireRole(role, "customer", () =>
      ok({
        customerId: "customer-1",
        deliveryUpdates: true,
        marketing: false,
        updatedAt: timestamp,
      }),
    );
  if (url.pathname === "/api/v1/account/export")
    return requireRole(role, "customer", () =>
      ok({
        profile: {
          userId: "user-customer",
          email: "customer@example.com",
          name: "Ada Customer",
          emailVerified: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        consents: [],
        sessions: [],
      }),
    );
  if (url.pathname === "/api/v1/account/deletion-eligibility")
    return requireRole(role, "customer", () =>
      ok({ eligible: false, reasons: ["ACTIVE_SUBSCRIPTION"] }),
    );
  if (url.pathname === "/api/v1/checkout/coupon")
    return requireRole(role, "customer", () =>
      ok({
        originalSubtotal: cart.subtotal,
        discount: money(0),
        deliveryFee: money(990),
        weeklyFee: money(19900),
        includedCredit: money(150000),
        overage: money(0),
        totalDue: money(19900),
        promotionCode: null,
      }),
    );
  if (url.pathname === "/api/v1/admin/operations/projection")
    return requireRole(role, "admin", () =>
      ok({
        cycleId: "cycle-2026-34",
        generatedAt: timestamp,
        outbox: { pendingCount: 2, oldestPendingAt: timestamp, deadLetteredCount: 0 },
        delivery: { totalAssignments: 8, assigned: 2, outForDelivery: 4, delivered: 2, failed: 0 },
        procurement: { openShortages: 1, exceptionalManifests: 0 },
        alerts: [
          {
            id: "alert-1",
            type: "procurement-shortages",
            severity: "warning",
            cycleId: "cycle-2026-34",
            message: "One shortage needs review",
            observedValue: 1,
            threshold: 1,
          },
        ],
      }),
    );
  if (url.pathname === "/api/v1/admin/procurement")
    return requireRole(role, "admin", () =>
      ok({ cycleId: "cycle-2026-34", demand: [], shortages: [], substitutions: [], manifests: [] }),
    );
  if (url.pathname === "/api/v1/admin/dispatch")
    return requireRole(role, "admin", () => ok({ cycleId: "cycle-2026-34", assignments: [] }));
  if (url.pathname === "/api/v1/admin/promotions")
    return requireRole(role, "admin", () => ok({ promotions: [] }));
  if (url.pathname === "/api/v1/admin/audit")
    return requireRole(role, "admin", () => ok({ events: [] }));
  if (url.pathname === "/api/v1/admin/support/cases")
    return requireRole(role, "admin", () => ok({ cases: [] }));
  if (url.pathname === "/api/v1/admin/order-requests")
    return requireRole(role, "admin", () => ok({ requests: [] }));
  if (url.pathname === "/api/v1/deliveryman/assignments")
    return requireRole(role, "deliveryman", () =>
      ok({ cycleId: "cycle-2026-34", assignments: [assignment] }),
    );
  if (url.pathname === "/api/v1/deliveryman/assignments/assignment-1/events")
    return requireRole(role, "deliveryman", () =>
      ok([
        {
          id: "event-1",
          clientEventId: "client-event-1",
          assignmentId: assignment.id,
          orderId: assignment.orderId,
          deliverymanUserId: "user-deliveryman",
          type: "arrived",
          occurredAt: timestamp,
          receivedAt: timestamp,
          note: null,
          failureReason: null,
        },
      ]),
    );
  if (url.pathname === "/api/v1/deliveryman/events" && method === "POST")
    return requireRole(role, "deliveryman", () =>
      ok({
        id: "event-recorded",
        clientEventId: body.clientEventId,
        assignmentId: body.assignmentId,
        orderId: body.orderId,
        deliverymanUserId: "user-deliveryman",
        type: body.type,
        occurredAt: body.occurredAt,
        receivedAt: timestamp,
        note: body.note ?? null,
        failureReason: body.failureReason ?? null,
      }),
    );
  return error(404, "NOT_FOUND", "fixture route not found");
}

function requireRole(actual, expected, callback) {
  return actual === expected
    ? callback()
    : error(403, "FORBIDDEN", `${expected} access is required`);
}
function ok(data) {
  return { status: 200, body: { data, meta } };
}
function error(status, code, message) {
  return { status, body: { error: { code, message }, meta } };
}
function readRole(cookie = "") {
  const match = /(?:^|;\s*)e2e-role=(customer|admin|deliveryman)(?:;|$)/.exec(cookie);
  return match?.[1] ?? null;
}
async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}
