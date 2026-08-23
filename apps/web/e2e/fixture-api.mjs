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
    {
      id: "sku-apples",
      categoryId: "fresh",
      name: "Apples",
      slug: "apples",
      description: "Crisp apples for snacks and salads.",
      unit: "kilogram",
      imageUrl: null,
      price: money(18125),
      active: true,
    },
    {
      id: "sku-basil",
      categoryId: "fresh",
      name: "Fresh basil",
      slug: "fresh-basil",
      description: "Fragrant basil for sauces and salads.",
      unit: "pack",
      imageUrl: null,
      price: money(5760),
      active: true,
    },
    {
      id: "sku-broccoli",
      categoryId: "fresh",
      name: "Broccoli",
      slug: "broccoli",
      description: "Fresh broccoli florets.",
      unit: "kilogram",
      imageUrl: null,
      price: money(17010),
      active: true,
    },
    {
      id: "sku-carrots",
      categoryId: "fresh",
      name: "Carrots",
      slug: "carrots",
      description: "Crunchy carrots for roasting and snacking.",
      unit: "kilogram",
      imageUrl: null,
      price: money(8500),
      active: true,
    },
    {
      id: "sku-cabbage",
      categoryId: "fresh",
      name: "Cabbage",
      slug: "cabbage",
      description: "Crisp cabbage for slaws and stir-fries.",
      unit: "kilogram",
      imageUrl: null,
      price: money(7812),
      active: true,
    },
    {
      id: "sku-cucumber",
      categoryId: "fresh",
      name: "Cucumber",
      slug: "cucumber",
      description: "Cool, crisp cucumbers.",
      unit: "kilogram",
      imageUrl: null,
      price: money(10332),
      active: true,
    },
  ],
  nextCursor: null,
};

let cart = {
  lines: [
    {
      skuId: "sku-tomato",
      quantity: 2,
      unitPrice: money(18000),
      name: "Roma tomatoes",
      slug: "roma-tomatoes",
      unit: "kilogram",
      imageUrl: null,
      substitutionPreference: "best_match",
    },
  ],
  subtotal: money(36000),
  updatedAt: timestamp,
  adjustments: [],
  maxQuantityPerLine: 1000,
};
const subscriptionScenarios = new Map();
function activeSubscription() {
  return {
    id: "subscription-1",
    customerId: "customer-1",
    planId: "plan-family",
    status: "active",
    billingStatus: "current",
    effectiveCycleId: "cycle-2026-34",
    skippedCycleId: null,
    lastAction: null,
    trialStartedAt: timestamp,
    trialEndsAt: "2026-09-30T15:59:59.999Z",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
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
const officeAddress = {
  ...address,
  id: "address-2",
  recipientName: "Ada Customer - Office",
  line1: "18 Commerce Avenue",
  barangay: "Bel-Air",
  postalCode: "1209",
  instructions: "Leave with reception",
  selected: false,
};
const unavailableAddress = {
  ...address,
  id: "address-3",
  recipientName: "Ada Customer - Provincial",
  line1: "7 Orchard Road",
  barangay: "Poblacion",
  city: "Tagaytay",
  province: "Cavite",
  postalCode: "4120",
  instructions: null,
  serviceable: false,
  selected: false,
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
    {
      id: "window-afternoon",
      cycleId: "cycle-2026-34",
      label: "Saturday 1:00 PM - 4:00 PM",
      startsAt: "2026-08-29T05:00:00.000Z",
      endsAt: "2026-08-29T08:00:00.000Z",
      capacity: 20,
      reserved: 11,
      remaining: 9,
      active: true,
    },
    {
      id: "window-full",
      cycleId: "cycle-2026-34",
      label: "Sunday 9:00 AM - 12:00 PM",
      startsAt: "2026-08-30T01:00:00.000Z",
      endsAt: "2026-08-30T04:00:00.000Z",
      capacity: 20,
      reserved: 20,
      remaining: 0,
      active: true,
    },
  ],
  selectedWindowId: "window-morning",
};
const checkoutScenarios = new Map();
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
  const scenario = readScenario(request.headers.cookie);
  const body = await readBody(request);
  const payload = routeResponse(request.method ?? "GET", url, role, scenario, body);
  response.statusCode = payload.status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(payload.body));
});

server.listen(8790, "127.0.0.1");

function routeResponse(method, url, role, scenario, body) {
  if (url.pathname === "/api/v1/me") {
    return role ? ok(sessions[role]) : error(401, "UNAUTHORIZED", "an active session is required");
  }
  if (url.pathname === "/api/v1/plans")
    return ok({
      plans:
        scenario === "subscription-empty"
          ? []
          : [
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
  if (url.pathname === "/api/v1/admin/identity/roles" && method === "POST")
    return requireRole(role, "admin", () =>
      ok({
        userId: body.userId,
        role: body.role,
        adminPermissions: body.adminPermissions ?? [],
        mfaRequired: body.role === "admin",
      }),
    );
  if (url.pathname === "/api/v1/promotions/banners")
    return ok({
      placement: url.searchParams.get("placement") ?? "home-hero",
      banners: [],
      cacheVersion: 1,
    });
  if (url.pathname === "/api/v1/cart")
    return requireRole(role, "customer", () => {
      if (method === "PUT") {
        if (body.expectedUpdatedAt !== undefined && body.expectedUpdatedAt !== cart.updatedAt) {
          return error(409, "CART_STALE", "your cart changed in another session");
        }
        const catalogById = new Map(catalog.items.map((item) => [item.id, item]));
        if (body.lines.some((line) => !catalogById.has(line.skuId))) {
          return error(409, "SKU_NOT_AVAILABLE", "one or more SKUs are unavailable");
        }
        const lines = body.lines.map((line) => {
          const item = catalogById.get(line.skuId);
          return {
            skuId: item.id,
            quantity: line.quantity,
            unitPrice: item.price,
            name: item.name,
            slug: item.slug,
            unit: item.unit,
            imageUrl: item.imageUrl,
            substitutionPreference: line.substitutionPreference ?? "best_match",
          };
        });
        cart = {
          lines,
          subtotal: money(
            lines.reduce((total, line) => total + line.unitPrice.centavos * line.quantity, 0),
          ),
          updatedAt: new Date(Date.parse(cart.updatedAt) + 1000).toISOString(),
          adjustments: [],
          maxQuantityPerLine: 1000,
        };
      }
      return ok(cart);
    });
  if (url.pathname === "/api/v1/subscription/trial" && method === "POST")
    return requireRole(role, "customer", () => {
      const subscription = activeSubscription();
      if (scenario) subscriptionScenarios.set(scenario, subscription);
      return ok(subscription);
    });
  if (url.pathname === "/api/v1/subscription")
    return requireRole(role, "customer", () => {
      if (
        (scenario?.startsWith("subscription-onboarding") || scenario === "subscription-empty") &&
        !subscriptionScenarios.has(scenario)
      ) {
        return error(404, "SUBSCRIPTION_NOT_FOUND", "no active subscription was found");
      }
      return ok(subscriptionScenarios.get(scenario) ?? activeSubscription());
    });
  if (url.pathname === "/api/v1/delivery-address")
    return requireRole(role, "customer", () => {
      const state = checkoutState(scenario);
      return ok(state.addresses.find((entry) => entry.id === state.selectedAddressId) ?? null);
    });
  if (url.pathname === "/api/v1/delivery-addresses")
    return requireRole(role, "customer", () => {
      const state = checkoutState(scenario);
      if (method === "PUT") return error(404, "NOT_FOUND", "fixture route not found");
      return ok({
        addresses: state.addresses.map((entry) => ({
          ...entry,
          selected: entry.id === state.selectedAddressId,
        })),
      });
    });
  if (/^\/api\/v1\/delivery-addresses\/[^/]+\/select$/.test(url.pathname) && method === "PUT")
    return requireRole(role, "customer", () => {
      const state = checkoutState(scenario);
      const addressId = decodeURIComponent(url.pathname.split("/")[4] ?? "");
      const selected = state.addresses.find((entry) => entry.id === addressId);
      if (!selected) return error(404, "DELIVERY_ADDRESS_NOT_FOUND", "address was not found");
      if (!selected.serviceable)
        return error(
          409,
          "DELIVERY_ADDRESS_UNSERVICEABLE",
          "delivery is not currently available for this postal code",
        );
      state.selectedAddressId = addressId;
      return ok({ ...selected, selected: true });
    });
  if (url.pathname === "/api/v1/delivery-windows")
    return requireRole(role, "customer", () => {
      const state = checkoutState(scenario);
      if (method === "PUT") {
        const selected = state.windows.find((entry) => entry.id === body.windowId);
        if (!selected || !selected.active || selected.remaining === 0)
          return error(409, "DELIVERY_WINDOW_UNAVAILABLE", "delivery window is unavailable");
        state.selectedWindowId = selected.id;
      }
      return ok({
        ...windows,
        windows: state.windows,
        selectedWindowId: state.selectedWindowId,
      });
    });
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
  if (url.pathname === "/api/v1/checkout/quote")
    return requireRole(role, "customer", () => ok(checkoutQuote()));
  if (url.pathname === "/api/v1/checkout/coupon")
    return requireRole(role, "customer", () => {
      if (method === "DELETE") return ok(checkoutQuote());
      if (method !== "POST") return error(405, "METHOD_NOT_ALLOWED", "method is not allowed");
      if (String(body.code ?? "").toUpperCase() !== "WELCOME")
        return error(409, "PROMOTION_NOT_FOUND", "promotion code was not found");
      return ok(checkoutQuote("WELCOME"));
    });
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
function checkoutState(scenario) {
  const key = scenario ?? "default";
  let state = checkoutScenarios.get(key);
  if (!state) {
    const emptyAddresses = scenario?.includes("empty-address");
    const emptyWindows = scenario?.includes("empty-windows");
    state = {
      addresses: emptyAddresses ? [] : [address, officeAddress, unavailableAddress],
      selectedAddressId: emptyAddresses ? null : address.id,
      windows: emptyWindows ? [] : windows.windows,
      selectedWindowId: emptyWindows ? null : windows.selectedWindowId,
    };
    checkoutScenarios.set(key, state);
  }
  return state;
}
function checkoutQuote(promotionCode = null) {
  const discountCentavos = promotionCode === "WELCOME" ? 5_000 : 0;
  const deliveryFeeCentavos = 990;
  const weeklyFeeCentavos = 19_900;
  const includedCreditCentavos = Math.min(
    Math.max(0, cart.subtotal.centavos - discountCentavos),
    150_000,
  );
  const overageCentavos = Math.max(
    0,
    cart.subtotal.centavos - discountCentavos - includedCreditCentavos,
  );
  return {
    originalSubtotal: cart.subtotal,
    discount: money(discountCentavos),
    deliveryFee: money(deliveryFeeCentavos),
    weeklyFee: money(weeklyFeeCentavos),
    includedCredit: money(includedCreditCentavos),
    overage: money(overageCentavos),
    totalDue: money(weeklyFeeCentavos + deliveryFeeCentavos + overageCentavos),
    promotionCode,
  };
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
function readScenario(cookie = "") {
  const match = /(?:^|;\s*)e2e-scenario=([^;]+)(?:;|$)/.exec(cookie);
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
