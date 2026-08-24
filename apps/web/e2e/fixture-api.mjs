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
    mfaRequired: false,
    mfaVerified: true,
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
    mfaRequired: true,
    mfaVerified: true,
    expiresAt: "2027-08-22T01:00:00.000Z",
  },
  deliveryman: {
    sessionId: "session-deliveryman",
    userId: "user-deliveryman",
    role: "deliveryman",
    adminPermissions: [],
    customerId: null,
    mfaRequired: false,
    mfaVerified: true,
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
      categoryIds: ["fresh"],
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
      categoryIds: ["pantry"],
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
      categoryIds: ["fresh"],
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
      categoryIds: ["fresh"],
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
      categoryIds: ["fresh"],
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
      categoryIds: ["fresh"],
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
      categoryIds: ["fresh"],
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
      categoryIds: ["fresh"],
      name: "Cucumber",
      slug: "cucumber",
      description: "Cool, crisp cucumbers.",
      unit: "kilogram",
      imageUrl: null,
      price: money(10332),
      active: true,
    },
  ],
  images: [],
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
const savedItemIds = new Set();
let notificationPreferences = {
  customerId: "customer-1",
  deliveryUpdates: true,
  marketing: false,
  updatedAt: timestamp,
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
const orderScenarios = new Map();
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
const trackingEvents = [
  {
    id: "tracking-event-1",
    clientEventId: "client-event-1",
    assignmentId: assignment.id,
    orderId: assignment.orderId,
    deliverymanUserId: assignment.deliverymanUserId,
    type: "arrived",
    occurredAt: timestamp,
    receivedAt: timestamp,
    note: null,
    failureReason: null,
  },
];

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
  if (url.pathname === "/api/v1/admin/catalog" && method === "GET")
    return requireRole(role, "admin", () =>
      ok({
        categories: catalog.categories,
        items: catalog.items.map(toAdminCatalogItem),
        images: catalog.images,
      }),
    );
  const catalogCategoryMatch = /^\/api\/v1\/admin\/catalog\/categories(?:\/([^/]+))?$/.exec(
    url.pathname,
  );
  if (catalogCategoryMatch && ["POST", "PUT"].includes(method))
    return requireRole(role, "admin", () => {
      const existingId = catalogCategoryMatch[1]
        ? decodeURIComponent(catalogCategoryMatch[1])
        : null;
      const existing = catalog.categories.find((item) => item.id === existingId);
      if (existingId && !existing)
        return error(404, "CATALOG_ITEM_NOT_FOUND", "catalog category was not found");
      const category = {
        id: existing?.id ?? `category-${slugify(body.name)}`,
        name: body.name,
        slug: existing?.slug ?? slugify(body.name),
        active: body.active,
      };
      if (existing) Object.assign(existing, category);
      else catalog.categories.push(category);
      return ok({ category, replayed: false });
    });
  const catalogItemMatch = /^\/api\/v1\/admin\/catalog\/items(?:\/([^/]+))?$/.exec(url.pathname);
  if (catalogItemMatch && ["POST", "PUT"].includes(method))
    return requireRole(role, "admin", () => {
      const existingId = catalogItemMatch[1] ? decodeURIComponent(catalogItemMatch[1]) : null;
      const existing = catalog.items.find((item) => item.id === existingId);
      if (existingId && !existing)
        return error(404, "CATALOG_ITEM_NOT_FOUND", "catalog item was not found");
      const priceCentavos = Math.floor(
        (body.procurementCostCentavos * (10_000 + body.markupBasisPoints) + 5_000) / 10_000,
      );
      const item = {
        id: existing?.id ?? `sku-${slugify(body.name)}`,
        categoryId: body.categoryIds[0],
        categoryIds: body.categoryIds,
        name: body.name,
        slug: existing?.slug ?? slugify(body.name),
        description: body.description,
        unit: body.unit,
        imageUrl: body.imageUrl,
        price: money(priceCentavos),
        active: body.status === "active",
        procurementCostCentavos: body.procurementCostCentavos,
        markupBasisPoints: body.markupBasisPoints,
        status: body.status,
      };
      if (existing) Object.assign(existing, item);
      else catalog.items.push(item);
      return ok({ item, replayed: false });
    });
  const catalogStatusMatch = /^\/api\/v1\/admin\/catalog\/([^/]+)\/status$/.exec(url.pathname);
  if (catalogStatusMatch && method === "PATCH")
    return requireRole(role, "admin", () => {
      const item = catalog.items.find(
        (candidate) => candidate.id === decodeURIComponent(catalogStatusMatch[1]),
      );
      if (!item) return error(404, "CATALOG_ITEM_NOT_FOUND", "catalog item was not found");
      item.status = body.status;
      item.active = body.status === "active";
      return ok({ id: item.id, status: body.status, updatedAt: timestamp });
    });
  if (url.pathname.startsWith("/api/v1/catalog/") && method === "GET") {
    const slug = decodeURIComponent(url.pathname.slice("/api/v1/catalog/".length));
    const item = catalog.items.find((candidate) => candidate.slug === slug);
    if (!item) return error(404, "CATALOG_ITEM_NOT_FOUND", "catalog item was not found");
    return ok(item);
  }
  if (url.pathname === "/api/v1/admin/identity/roles" && method === "POST")
    return requireRole(role, "admin", () =>
      ok({
        userId: body.userId,
        role: body.role,
        adminPermissions: body.adminPermissions ?? [],
        mfaRequired: body.role === "admin",
      }),
    );
  if (url.pathname === "/api/v1/admin/launch-configuration" && method === "PUT")
    return requireRole(role, "admin", () =>
      ok({
        idempotencyKey: "fixture-launch",
        categoryCount: body.categories?.length ?? 0,
        skuCount: body.skus?.length ?? 0,
        deliveryWindowCount: body.deliveryWindows?.length ?? 0,
        appliedAt: timestamp,
        replayed: false,
      }),
    );
  if (url.pathname === "/api/v1/promotions/banners")
    return ok({
      placement: url.searchParams.get("placement") ?? "home-hero",
      banners: [],
      cacheVersion: 1,
    });
  if (url.pathname === "/api/v1/cart")
    if (!role && method === "GET")
      return error(401, "UNAUTHENTICATED", "an active customer session is required");
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
  if (url.pathname === "/api/v1/saved-items")
    return requireRole(role, "customer", () =>
      ok({
        items: [...savedItemIds].flatMap((skuId) => {
          const item = catalog.items.find((candidate) => candidate.id === skuId);
          return item
            ? [
                {
                  skuId: item.id,
                  name: item.name,
                  slug: item.slug,
                  description: item.description,
                  unit: item.unit,
                  imageUrl: item.imageUrl,
                  price: item.price,
                  savedAt: timestamp,
                },
              ]
            : [];
        }),
      }),
    );
  if (url.pathname.startsWith("/api/v1/saved-items/") && method === "PUT")
    return requireRole(role, "customer", () => {
      const skuId = decodeURIComponent(url.pathname.slice("/api/v1/saved-items/".length));
      if (!catalog.items.some((item) => item.id === skuId))
        return error(409, "SKU_NOT_AVAILABLE", "the catalog item is not available");
      savedItemIds.add(skuId);
      return ok({
        items: [...savedItemIds].flatMap((id) => {
          const item = catalog.items.find((candidate) => candidate.id === id);
          return item
            ? [
                {
                  skuId: item.id,
                  name: item.name,
                  slug: item.slug,
                  description: item.description,
                  unit: item.unit,
                  imageUrl: item.imageUrl,
                  price: item.price,
                  savedAt: timestamp,
                },
              ]
            : [];
        }),
      });
    });
  if (url.pathname.startsWith("/api/v1/saved-items/") && method === "DELETE")
    return requireRole(role, "customer", () => {
      savedItemIds.delete(decodeURIComponent(url.pathname.slice("/api/v1/saved-items/".length)));
      return ok({
        items: [...savedItemIds].flatMap((skuId) => {
          const item = catalog.items.find((candidate) => candidate.id === skuId);
          return item
            ? [
                {
                  skuId: item.id,
                  name: item.name,
                  slug: item.slug,
                  description: item.description,
                  unit: item.unit,
                  imageUrl: item.imageUrl,
                  price: item.price,
                  savedAt: timestamp,
                },
              ]
            : [];
        }),
      });
    });
  if (url.pathname === "/api/v1/subscription/trial" && method === "POST")
    return requireRole(role, "customer", () => {
      const subscription = activeSubscription();
      if (scenario) subscriptionScenarios.set(scenario, subscription);
      return ok(subscription);
    });
  if (url.pathname === "/api/v1/subscription")
    if (!role) return error(401, "UNAUTHENTICATED", "an active customer session is required");
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
  if (url.pathname === "/api/v1/orders" && method === "POST")
    return requireRole(role, "customer", () => {
      const key = scenario ?? "default";
      const existing = orderScenarios.get(key);
      if (existing) return ok(existing);
      const order = {
        id: "order-fixture-1",
        subscriptionId: "subscription-1",
        planId: "plan-family",
        cycleId: "cycle-2026-34",
        lines: cart.lines.map((line) => ({
          skuId: line.skuId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        weeklyCredit: money(150000),
        totals: orderTotals(body.promotionCode ?? null),
        appliedPromotion: body.promotionCode
          ? {
              id: "promotion-welcome",
              code: body.promotionCode,
              version: 1,
              discount: money(5000),
              deliveryFee: money(990),
            }
          : null,
        deliveryAddress: address,
        deliveryWindow: {
          id: "window-morning",
          cycleId: "cycle-2026-34",
          label: "Saturday 9:00 AM - 12:00 PM",
          startsAt: "2026-08-29T01:00:00.000Z",
          endsAt: "2026-08-29T04:00:00.000Z",
        },
        paymentState: "unpaid",
        status: "locked",
        lockedAt: timestamp,
      };
      orderScenarios.set(key, order);
      return ok(order);
    });
  if (url.pathname === "/api/v1/orders" && method === "GET")
    return requireRole(role, "customer", () => {
      if (orderScenarios.size === 0) orderScenarios.set("default", fixtureOrder());
      return ok({ orders: [...orderScenarios.values(), fixtureCustomerOrder()] });
    });
  if (url.pathname === "/api/v1/orders/order-1/tracking" && method === "GET")
    return requireRole(role, "customer", () =>
      ok({
        orderId: "order-1",
        assignmentId: assignment.id,
        windowId: assignment.windowId,
        status: assignment.status,
        latestEventType: trackingEvents.at(-1)?.type ?? null,
        events: trackingEvents,
      }),
    );
  if (url.pathname === "/api/v1/orders/order-1/media" && method === "GET")
    return requireRole(role, "customer", () =>
      ok({
        media: [
          {
            id: "media-1",
            orderId: "order-1",
            assignmentId: assignment.id,
            kind: "proof_of_delivery",
            contentType: "image/jpeg",
            sizeBytes: 128_000,
            createdAt: timestamp,
            downloadUrl: "https://media.invalid/download/orders%2Forder-1%2Fproof.jpg",
            downloadUrlExpiresAt: "2026-08-22T01:15:00.000Z",
          },
        ],
      }),
    );
  if (url.pathname === "/api/v1/payments/charge" && method === "POST")
    return requireRole(role, "customer", () => {
      const order = [...orderScenarios.values()].find((candidate) => candidate.id === body.orderId);
      if (!order) return error(404, "ORDER_NOT_FOUND", "the order was not found");
      if (scenario?.includes("payment-failure") && !checkoutScenarios.get(`${scenario}:retried`)) {
        checkoutScenarios.set(`${scenario}:retried`, true);
        order.paymentState = "failed";
        return error(409, "PAYMENT_DECLINED", "payment was declined by the local provider");
      }
      order.paymentState = scenario?.includes("payment-pending") ? "pending" : "paid";
      return ok({
        id: "attempt-fixture-1",
        orderId: order.id,
        amount: order.totals.totalDue,
        status: order.paymentState === "paid" ? "succeeded" : "pending",
        providerReference: "fake-charge-order-fixture-1",
        failureCode: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    });
  if (url.pathname === "/api/v1/order-requests")
    return requireRole(role, "customer", () =>
      method === "POST"
        ? ok({
            id: "request-1",
            customerId: "customer-1",
            orderId: body.orderId,
            kind: body.kind,
            reason: body.reason,
            status: "pending",
            createdAt: timestamp,
            updatedAt: timestamp,
          })
        : ok({ requests: [] }),
    );
  if (url.pathname === "/api/v1/order-substitutions")
    return requireRole(role, "customer", () =>
      ok({
        substitutions: [
          {
            id: "customer-substitution-1",
            customerId: "customer-1",
            orderId: "order-fixture-1",
            shortageId: "shortage-1",
            originalSkuId: "sku-tomato",
            procurementSubstitutionId: "substitution-1",
            substituteSkuId: "sku-carrots",
            quantity: 1,
            status: "pending",
            decidedAt: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }),
    );
  if (
    url.pathname === "/api/v1/order-substitutions/customer-substitution-1/decision" &&
    method === "POST"
  )
    return requireRole(role, "customer", () =>
      ok({
        id: "customer-substitution-1",
        customerId: "customer-1",
        orderId: "order-fixture-1",
        shortageId: "shortage-1",
        originalSkuId: "sku-tomato",
        procurementSubstitutionId: "substitution-1",
        substituteSkuId: "sku-carrots",
        quantity: 1,
        status: body.decision === "accept" ? "accepted" : "rejected",
        decidedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    );
  if (url.pathname === "/api/v1/support/cases")
    return requireRole(role, "customer", () =>
      method === "POST"
        ? ok({
            id: "case-1",
            customerId: "customer-1",
            subject: body.subject,
            message: body.message,
            status: "open",
            createdAt: timestamp,
            updatedAt: timestamp,
          })
        : ok({ cases: [] }),
    );
  if (url.pathname === "/api/v1/notification-preferences")
    return requireRole(role, "customer", () => {
      if (method === "PUT") {
        notificationPreferences = {
          ...notificationPreferences,
          deliveryUpdates: Boolean(body.deliveryUpdates),
          marketing: Boolean(body.marketing),
          updatedAt: new Date(Date.parse(notificationPreferences.updatedAt) + 1000).toISOString(),
        };
      }
      return ok(notificationPreferences);
    });
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
      ok({
        cycleId: "cycle-2026-34",
        demand: [
          {
            cycleId: "cycle-2026-34",
            skuId: "sku-tomato",
            orderedQuantity: 12,
            purchasedQuantity: 0,
            status: "open",
          },
        ],
        shortages: [],
        substitutions: [],
        manifests: [],
      }),
    );
  if (url.pathname === "/api/v1/admin/procurement/purchases" && method === "PUT")
    return requireRole(role, "admin", () =>
      ok({
        cycleId: "cycle-2026-34",
        demand: [
          {
            cycleId: "cycle-2026-34",
            skuId: body.skuId,
            orderedQuantity: 12,
            purchasedQuantity: body.purchasedQuantity,
            status: "purchased",
          },
        ],
        shortages: [],
        substitutions: [],
        manifests: [],
      }),
    );
  if (url.pathname === "/api/v1/admin/procurement/shortages" && method === "POST")
    return requireRole(role, "admin", () =>
      ok({
        cycleId: "cycle-2026-34",
        demand: [],
        shortages: [
          {
            id: "shortage-1",
            cycleId: "cycle-2026-34",
            skuId: body.skuId,
            requestedQuantity: body.requestedQuantity,
            availableQuantity: body.availableQuantity,
            status: "open",
            createdAt: timestamp,
          },
        ],
        substitutions: [],
        manifests: [],
      }),
    );
  if (url.pathname === "/api/v1/admin/procurement/substitutions" && method === "POST")
    return requireRole(role, "admin", () =>
      ok({
        cycleId: "cycle-2026-34",
        demand: [],
        shortages: [],
        substitutions: [
          {
            id: "substitution-1",
            shortageId: body.shortageId,
            originalSkuId: "sku-tomato",
            substituteSkuId: body.substituteSkuId,
            quantity: body.quantity,
            status: body.status,
            approvedAt: body.status === "approved" ? timestamp : null,
          },
        ],
        manifests: [],
      }),
    );
  if (url.pathname === "/api/v1/admin/packing/manifests" && method === "POST")
    return requireRole(role, "admin", () =>
      ok({
        cycleId: "cycle-2026-34",
        demand: [],
        shortages: [],
        substitutions: [],
        manifests: [
          {
            id: "manifest-1",
            cycleId: "cycle-2026-34",
            orderId: body.orderId,
            status: body.status,
            createdAt: timestamp,
          },
        ],
      }),
    );
  if (url.pathname === "/api/v1/admin/dispatch")
    return requireRole(role, "admin", () =>
      ok({
        cycleId: "cycle-2026-34",
        assignments:
          method === "POST"
            ? [
                {
                  id: "dispatch-1",
                  cycleId: "cycle-2026-34",
                  orderId: body.orderId,
                  windowId: body.windowId,
                  deliverymanUserId: body.deliverymanUserId,
                  status: "assigned",
                  assignedAt: timestamp,
                },
              ]
            : [],
      }),
    );
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
    return requireRole(role, "deliveryman", () => ok(trackingEvents));
  if (url.pathname === "/api/v1/deliveryman/events" && method === "POST")
    return requireRole(role, "deliveryman", () => {
      const existing = trackingEvents.find((event) => event.clientEventId === body.clientEventId);
      if (existing) return ok(existing);
      const event = {
        id: `event-${trackingEvents.length + 1}`,
        clientEventId: body.clientEventId,
        assignmentId: body.assignmentId,
        orderId: body.orderId,
        deliverymanUserId: "user-deliveryman",
        type: body.type,
        occurredAt: body.occurredAt,
        receivedAt: timestamp,
        note: body.note ?? null,
        failureReason: body.failureReason ?? null,
      };
      trackingEvents.push(event);
      assignment.lastEventType = event.type;
      assignment.status =
        event.type === "delivered"
          ? "delivered"
          : event.type === "failed"
            ? "failed"
            : "out_for_delivery";
      return ok(event);
    });
  return error(404, "NOT_FOUND", "fixture route not found");
}

function requireRole(actual, expected, callback) {
  return actual === expected
    ? callback()
    : error(403, "FORBIDDEN", `${expected} access is required`);
}
function toAdminCatalogItem(item) {
  return {
    ...item,
    procurementCostCentavos: item.procurementCostCentavos ?? item.price.centavos,
    markupBasisPoints: item.markupBasisPoints ?? 0,
    status: item.status ?? (item.active ? "active" : "paused"),
  };
}
function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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
function orderTotals(promotionCode = null) {
  const quote = checkoutQuote(promotionCode);
  return {
    subtotal: quote.originalSubtotal,
    discount: quote.discount,
    weeklyFee: quote.weeklyFee,
    includedCredit: quote.includedCredit,
    overage: quote.overage,
    deliveryFee: quote.deliveryFee,
    totalDue: quote.totalDue,
  };
}
function fixtureOrder() {
  return {
    id: "order-fixture-1",
    subscriptionId: "subscription-1",
    planId: "plan-family",
    cycleId: "cycle-2026-34",
    lines: [{ skuId: "sku-tomato", quantity: 2, unitPrice: money(18000) }],
    weeklyCredit: money(150000),
    totals: orderTotals(),
    appliedPromotion: null,
    deliveryAddress: address,
    deliveryWindow: {
      id: "window-morning",
      cycleId: "cycle-2026-34",
      label: "Saturday 9:00 AM - 12:00 PM",
      startsAt: "2026-08-29T01:00:00.000Z",
      endsAt: "2026-08-29T04:00:00.000Z",
    },
    paymentState: "paid",
    status: "locked",
    lockedAt: timestamp,
  };
}
function fixtureCustomerOrder() {
  return { ...fixtureOrder(), id: "order-1" };
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
