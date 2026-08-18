import {
  createPersistentSessionResolver,
  createBetterAuthSessionResolver,
  resolveActiveSession,
  toSessionSummary,
  type BetterAuthApi,
  type SessionResolver,
} from "@carbon/auth";
import {
  DefaultCartLockService,
  DefaultPlanApprovalService,
  DefaultSubscriptionCommandService,
  type CartLockService,
  type PlanApprovalService,
  type SubscriptionCommandService,
} from "@carbon/application";
import { parseAllowedOrigins, parseRuntimeEnvironment } from "@carbon/config";
import {
  catalogListResponseSchema,
  cartResponseSchema,
  cartUpdateRequestSchema,
  type ApiErrorResponse,
  type CartResponse,
  type CatalogListResponse,
  currentSessionResponseSchema,
  type CurrentSessionResponse,
  planAdminUpsertRequestSchema,
  planApprovalDecisionRequestSchema,
  planChangeRequestResponseSchema,
  planResponseSchema,
  plansListResponseSchema,
  orderCreateRequestSchema,
  orderResponseSchema,
  subscriptionActionRequestSchema,
  subscriptionResponseSchema,
  type SubscriptionResponse,
  type PlansListResponse,
  type HealthResponse,
} from "@carbon/contracts";
import {
  createDefaultCatalogReader,
  createDefaultPlanReader,
  D1CartRepository,
  D1CatalogReader,
  D1OrderRepository,
  D1OutboxPublisher,
  D1IdentityRepository,
  D1PlanApprovalRepository,
  D1PlanReader,
  D1PlanRepository,
  D1SubscriptionIdempotencyStore,
  D1SubscriptionRepository,
  InMemoryCartRepository,
  type CartRepository,
  type CatalogDatabase,
  type CatalogReader,
  type CatalogCheckoutReader,
  type PlanLookup,
  type PlanReader,
  type PlanRepository,
  type SubscriptionReader,
} from "@carbon/db";
import {
  addMoney,
  assignWeeklyCycle,
  createMoney,
  createPlan,
  hasAdminPermission,
  multiplyMoney,
  type Session,
} from "@carbon/domain";
import { createLogger, resolveCorrelationId, type LogSink } from "@carbon/observability";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";

export type ApiBindings = Readonly<{
  APP_ENV?: string;
  CATALOG_CACHE_VERSION?: string;
  CORS_ORIGINS?: string;
  DB?: CatalogDatabase;
  DELIVERY_FEE_CENTAVOS?: string;
  PLAN_CACHE_VERSION?: string;
  VERSION?: string;
}>;

type ApiVariables = {
  correlationId: string;
  session: Session | null;
};

type ApiEnv = {
  Bindings: ApiBindings;
  Variables: ApiVariables;
};

export type ApiApp = Hono<ApiEnv>;
type ApiContext = Context<ApiEnv>;

export type ApiOptions = Readonly<{
  catalogReader?: CatalogReader;
  generateCorrelationId?: () => string;
  now?: () => Date;
  planReader?: PlanReader;
  planRepository?: PlanRepository;
  planApprovalService?: PlanApprovalService;
  catalogCheckoutReader?: CatalogCheckoutReader;
  cartRepository?: CartRepository;
  planLookup?: PlanLookup;
  orderLockService?: CartLockService;
  deliveryFeeCentavos?: number;
  subscriptionReader?: SubscriptionReader;
  sink?: LogSink;
  sessionResolver?: SessionResolver;
  betterAuthApi?: BetterAuthApi;
  subscriptionService?: SubscriptionCommandService;
  version?: string;
}>;

export function createApi(options: ApiOptions = {}): ApiApp {
  const now = options.now ?? (() => new Date());
  const generateCorrelationId = options.generateCorrelationId ?? (() => crypto.randomUUID());
  const sink = options.sink ?? ((entry) => console.log(JSON.stringify(entry)));
  const baseLogger = createLogger({
    service: "api",
    sink,
    now,
  });
  const app = new Hono<ApiEnv>();
  const fallbackCartRepository = new InMemoryCartRepository();

  app.use("*", secureHeaders());
  app.use("*", async (context, next) => {
    const correlationId = resolveCorrelationId(
      context.req.header("x-correlation-id"),
      generateCorrelationId,
    );
    const logger = baseLogger.withCorrelationId(correlationId);

    context.set("correlationId", correlationId);
    context.header("x-correlation-id", correlationId);
    context.header("vary", "Origin");

    await next();

    logger.info("request.completed", {
      method: context.req.method,
      path: context.req.path,
      status: context.res.status,
    });
  });

  app.use(
    "/api/*",
    cors({
      allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "X-Correlation-Id"],
      allowMethods: ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
      origin: (origin, context: ApiContext) => {
        const bindings: ApiBindings = context.env ?? {};
        const environment = parseRuntimeEnvironment(bindings.APP_ENV);
        const origins = parseAllowedOrigins(bindings.CORS_ORIGINS, environment);

        return origins.includes(origin) ? origin : undefined;
      },
    }),
  );

  app.use("/api/v1/*", async (context, next) => {
    const protectedPath =
      context.req.path === "/api/v1/me" ||
      context.req.path === "/api/v1/subscription" ||
      context.req.path === "/api/v1/subscription/actions" ||
      context.req.path === "/api/v1/cart" ||
      context.req.path === "/api/v1/orders" ||
      context.req.path.startsWith("/api/v1/admin/");
    if (!protectedPath) {
      context.set("session", null);
      await next();
      return;
    }

    const bindings: ApiBindings = context.env ?? {};
    const resolver =
      options.sessionResolver ??
      (options.betterAuthApi
        ? createBetterAuthSessionResolver(options.betterAuthApi)
        : bindings.DB
          ? createPersistentSessionResolver(new D1IdentityRepository(bindings.DB))
          : null);
    const session = resolver
      ? await resolveActiveSession(resolver, context.req.raw, now().toISOString())
      : null;
    context.set("session", session);
    if (!session) {
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active session is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    await next();
  });

  const healthHandler = (context: ApiContext) => {
    const bindings: ApiBindings = context.env ?? {};
    const environment = parseRuntimeEnvironment(bindings.APP_ENV);
    const body: HealthResponse = {
      data: {
        status: "ok",
        service: "api",
        environment,
        version: bindings.VERSION ?? options.version ?? "0.0.0",
        timestamp: now().toISOString(),
      },
      meta: {
        correlationId: context.get("correlationId"),
      },
    };

    return context.json(body, 200);
  };

  app.get("/health", healthHandler);
  app.get("/api/v1/health", healthHandler);

  app.get("/api/v1/plans", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const planReader =
      options.planReader ??
      (bindings.DB ? new D1PlanReader(bindings.DB) : createDefaultPlanReader());
    const body: PlansListResponse = {
      data: { plans: [...(await planReader.listPublic())] },
      meta: { correlationId: context.get("correlationId") },
    };

    plansListResponseSchema.parse(body);
    const cacheVersion =
      bindings.PLAN_CACHE_VERSION ??
      (planReader.getCacheVersion
        ? await planReader.getCacheVersion()
        : (options.version ?? "0.0.0"));
    const etag = `"plans-${encodeCursor(cacheVersion)}"`;
    context.header("cache-control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    context.header("etag", etag);
    context.header("x-plan-cache-version", cacheVersion);
    if (context.req.header("if-none-match") === etag) {
      return context.body(null, 304);
    }
    return context.json(body, 200);
  });

  app.put("/api/v1/admin/plans/:id", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const planRepository =
      options.planRepository ?? (bindings.DB ? new D1PlanRepository(bindings.DB) : undefined);
    const planApprovalService =
      options.planApprovalService ??
      (bindings.DB
        ? new DefaultPlanApprovalService(new D1PlanApprovalRepository(bindings.DB))
        : undefined);
    if (!planRepository && !planApprovalService) {
      return context.json(
        errorResponse(
          "PLAN_CONFIGURATION_UNAVAILABLE",
          "plan configuration is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "pricing")) {
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "pricing administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    }
    const input = planAdminUpsertRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_PLAN_CONFIGURATION",
          "plan configuration is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    try {
      const plan = createPlan({
        id: context.req.param("id"),
        code: input.data.code,
        name: input.data.name,
        weeklyFee: createMoney(input.data.weeklyFee.centavos),
        weeklyCredit: createMoney(input.data.weeklyCredit.centavos),
        displayOrder: input.data.displayOrder,
        active: input.data.active,
      });
      if (planApprovalService) {
        const requestId = context.req.header("idempotency-key")?.trim();
        const request = await planApprovalService.propose({
          plan,
          proposedByUserId: session.userId,
          createdAt: now().toISOString(),
          ...(requestId ? { requestId } : {}),
        });
        const body = { data: request, meta: { correlationId: context.get("correlationId") } };
        planChangeRequestResponseSchema.parse(body);
        return context.json(body, 202);
      }
      await planRepository?.save(plan, now().toISOString());
      const body = { data: plan, meta: { correlationId: context.get("correlationId") } };
      planResponseSchema.parse(body);
      return context.json(body, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "plan configuration failed";
      return context.json(
        errorResponse("INVALID_PLAN_CONFIGURATION", message, context.get("correlationId")),
        400,
      );
    }
  });

  app.post("/api/v1/admin/plan-change-requests/:id/decision", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const planApprovalService =
      options.planApprovalService ??
      (bindings.DB
        ? new DefaultPlanApprovalService(new D1PlanApprovalRepository(bindings.DB))
        : undefined);
    if (!planApprovalService) {
      return context.json(
        errorResponse(
          "PLAN_APPROVAL_UNAVAILABLE",
          "plan approval is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "finance")) {
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "finance administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    }
    const input = planApprovalDecisionRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_PLAN_APPROVAL",
          "plan approval decision is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    try {
      const request = await planApprovalService.decide({
        requestId: context.req.param("id"),
        approved: input.data.approved,
        decidedByUserId: session.userId,
        decidedAt: now().toISOString(),
        ...(input.data.reason ? { reason: input.data.reason } : {}),
      });
      const body = { data: request, meta: { correlationId: context.get("correlationId") } };
      planChangeRequestResponseSchema.parse(body);
      return context.json(body, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "plan approval failed";
      return context.json(
        errorResponse("INVALID_PLAN_APPROVAL", message, context.get("correlationId")),
        409,
      );
    }
  });

  app.post("/api/v1/subscription/actions", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const subscriptionService =
      options.subscriptionService ??
      (bindings.DB
        ? new DefaultSubscriptionCommandService(
            new D1SubscriptionRepository(bindings.DB),
            new D1SubscriptionIdempotencyStore(bindings.DB),
          )
        : undefined);
    if (!subscriptionService) {
      return context.json(
        errorResponse(
          "SUBSCRIPTION_UNAVAILABLE",
          "subscription actions are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const session = context.get("session");
    if (!session || session.role !== "customer" || !session.customerId) {
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    const input = subscriptionActionRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_SUBSCRIPTION_ACTION",
          "subscription action is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const idempotencyKey = context.req.header("idempotency-key");
    if (!idempotencyKey?.trim()) {
      return context.json(
        errorResponse(
          "MISSING_IDEMPOTENCY_KEY",
          "Idempotency-Key is required",
          context.get("correlationId"),
        ),
        400,
      );
    }

    try {
      const commandTime = now();
      const cycle = assignWeeklyCycle(commandTime);
      const subscription = await subscriptionService.execute({
        customerId: session.customerId,
        idempotencyKey,
        command: {
          action: input.data.action,
          cycleId: cycle.id,
          cutoffAt: cycle.cutoffAt,
          now: commandTime.toISOString(),
        },
      });
      const body: SubscriptionResponse = {
        data: subscription,
        meta: { correlationId: context.get("correlationId") },
      };
      subscriptionResponseSchema.parse(body);
      return context.json(body, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "subscription action failed";
      const code = message.includes("idempotency")
        ? "IDEMPOTENCY_KEY_REUSED"
        : message.includes("not found")
          ? "SUBSCRIPTION_NOT_FOUND"
          : "INVALID_SUBSCRIPTION_ACTION";
      return context.json(errorResponse(code, message, context.get("correlationId")), 409);
    }
  });

  app.get("/api/v1/subscription", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const subscriptionReader =
      options.subscriptionReader ??
      (bindings.DB ? new D1SubscriptionRepository(bindings.DB) : undefined);
    if (!subscriptionReader) {
      return context.json(
        errorResponse(
          "SUBSCRIPTION_UNAVAILABLE",
          "subscription reads are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const session = context.get("session");
    if (!session || session.role !== "customer" || !session.customerId) {
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    const subscription = await subscriptionReader.findByCustomerId(session.customerId);
    if (!subscription) {
      return context.json(
        errorResponse(
          "SUBSCRIPTION_NOT_FOUND",
          "subscription was not found",
          context.get("correlationId"),
        ),
        404,
      );
    }
    const body: SubscriptionResponse = {
      data: subscription,
      meta: { correlationId: context.get("correlationId") },
    };
    subscriptionResponseSchema.parse(body);
    context.header("cache-control", "private, no-store");
    return context.json(body, 200);
  });

  app.get("/api/v1/cart", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const cartRepository =
      options.cartRepository ??
      (bindings.DB ? new D1CartRepository(bindings.DB) : fallbackCartRepository);
    const catalogReader =
      options.catalogCheckoutReader ??
      (bindings.DB ? new D1CatalogReader(bindings.DB) : createDefaultCatalogReader());
    const session = context.get("session");
    if (!session || session.role !== "customer" || !session.customerId) {
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    const cart = await cartRepository.findByCustomerId(session.customerId);
    const result = await resolveCartResponse(
      cart?.lines ?? [],
      cart?.updatedAt ?? null,
      catalogReader,
      context.get("correlationId"),
    );
    if ("error" in result) {
      return context.json(result, 409);
    }
    context.header("cache-control", "private, no-store");
    return context.json(result, 200);
  });

  app.put("/api/v1/cart", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const cartRepository =
      options.cartRepository ??
      (bindings.DB ? new D1CartRepository(bindings.DB) : fallbackCartRepository);
    const catalogReader =
      options.catalogCheckoutReader ??
      (bindings.DB ? new D1CatalogReader(bindings.DB) : createDefaultCatalogReader());
    const session = context.get("session");
    if (!session || session.role !== "customer" || !session.customerId) {
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    const input = cartUpdateRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!input.success) {
      return context.json(
        errorResponse("INVALID_CART", "cart lines are invalid", context.get("correlationId")),
        400,
      );
    }
    const skuIds = input.data.lines.map((line) => line.skuId);
    if (new Set(skuIds).size !== skuIds.length) {
      return context.json(
        errorResponse(
          "DUPLICATE_CART_SKU",
          "cart lines cannot contain duplicate SKUs",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const updatedAt = now().toISOString();
    const result = await resolveCartResponse(
      input.data.lines,
      updatedAt,
      catalogReader,
      context.get("correlationId"),
    );
    if ("error" in result) {
      return context.json(result, 409);
    }
    await cartRepository.save({
      customerId: session.customerId,
      lines: input.data.lines,
      updatedAt,
    });
    context.header("cache-control", "private, no-store");
    return context.json(result, 200);
  });

  app.post("/api/v1/orders", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const orderLockService =
      options.orderLockService ??
      (bindings.DB
        ? new DefaultCartLockService(
            new D1OrderRepository(bindings.DB),
            new D1OutboxPublisher(bindings.DB),
          )
        : undefined);
    const subscriptionReader =
      options.subscriptionReader ??
      (bindings.DB ? new D1SubscriptionRepository(bindings.DB) : undefined);
    const catalogReader =
      options.catalogCheckoutReader ??
      (bindings.DB ? new D1CatalogReader(bindings.DB) : createDefaultCatalogReader());
    const planLookup =
      options.planLookup ??
      (bindings.DB ? new D1PlanReader(bindings.DB) : createDefaultPlanReader());
    const cartRepository =
      options.cartRepository ??
      (bindings.DB ? new D1CartRepository(bindings.DB) : fallbackCartRepository);

    if (!orderLockService || !subscriptionReader || !planLookup) {
      return context.json(
        errorResponse(
          "ORDER_UNAVAILABLE",
          "order creation is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const session = context.get("session");
    if (!session || session.role !== "customer" || !session.customerId) {
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    const idempotencyKey = context.req.header("idempotency-key");
    if (!idempotencyKey?.trim()) {
      return context.json(
        errorResponse(
          "MISSING_IDEMPOTENCY_KEY",
          "Idempotency-Key is required",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const input = orderCreateRequestSchema.safeParse(await context.req.json().catch(() => ({})));
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_ORDER_REQUEST",
          "order lines are invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const subscription = await subscriptionReader.findByCustomerId(session.customerId);
    if (!subscription || subscription.status !== "active") {
      return context.json(
        errorResponse(
          "SUBSCRIPTION_NOT_ELIGIBLE",
          "an active subscription is required to place an order",
          context.get("correlationId"),
        ),
        409,
      );
    }
    const plan = await planLookup.findActiveById(subscription.planId);
    if (!plan) {
      return context.json(
        errorResponse(
          "PLAN_NOT_FOUND",
          "the subscription plan is unavailable",
          context.get("correlationId"),
        ),
        409,
      );
    }
    const savedCart = input.data.lines
      ? null
      : await cartRepository.findByCustomerId(session.customerId);
    const requestedLines = input.data.lines ?? savedCart?.lines ?? [];
    if (requestedLines.length === 0) {
      return context.json(
        errorResponse(
          "CART_EMPTY",
          "the cart must contain at least one available SKU",
          context.get("correlationId"),
        ),
        409,
      );
    }
    const skuIds = requestedLines.map((line) => line.skuId);
    if (new Set(skuIds).size !== skuIds.length) {
      return context.json(
        errorResponse(
          "DUPLICATE_ORDER_SKU",
          "order lines cannot contain duplicate SKUs",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const catalogItems = await catalogReader.findActiveByIds(skuIds);
    const catalogById = new Map(catalogItems.map((item) => [item.id, item]));
    if (catalogItems.length !== skuIds.length) {
      return context.json(
        errorResponse(
          "SKU_NOT_AVAILABLE",
          "one or more SKUs are unavailable",
          context.get("correlationId"),
        ),
        409,
      );
    }
    const cartLines = requestedLines.map((line) => {
      const item = catalogById.get(line.skuId);
      if (!item) {
        throw new Error("SKU_NOT_AVAILABLE");
      }
      return {
        skuId: item.id,
        quantity: line.quantity,
        unitPrice: item.price,
      };
    });
    const deliveryFeeCentavos = resolveDeliveryFeeCentavos(options.deliveryFeeCentavos, bindings);
    if (deliveryFeeCentavos === null) {
      return context.json(
        errorResponse(
          "ORDER_CONFIGURATION_INVALID",
          "delivery fee configuration is invalid",
          context.get("correlationId"),
        ),
        503,
      );
    }
    try {
      const order = await orderLockService.lock({
        customerId: session.customerId,
        subscriptionId: subscription.id,
        idempotencyKey,
        cart: { lines: cartLines },
        plan,
        deliveryFee: { centavos: deliveryFeeCentavos, currency: "PHP" },
        lockedAt: now().toISOString(),
      });
      if (!input.data.lines) {
        await cartRepository.clear(session.customerId);
      }
      const body = {
        data: {
          id: order.id,
          subscriptionId: order.subscriptionId,
          planId: order.planId,
          lines: order.cart.lines,
          weeklyCredit: order.weeklyCredit,
          totals: order.totals,
          status: order.status,
          lockedAt: order.lockedAt,
        },
        meta: { correlationId: context.get("correlationId") },
      };
      orderResponseSchema.parse(body);
      return context.json(body, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "order creation failed";
      const code = message.includes("idempotency")
        ? "IDEMPOTENCY_KEY_REUSED"
        : message.includes("SKU")
          ? "SKU_NOT_AVAILABLE"
          : "INVALID_ORDER_REQUEST";
      return context.json(errorResponse(code, message, context.get("correlationId")), 409);
    }
  });

  app.get("/api/v1/catalog", async (context) => {
    const limitValue = context.req.query("limit");
    const limit = limitValue ? Number(limitValue) : 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return context.json(
        errorResponse(
          "INVALID_CATALOG_PAGINATION",
          "limit must be an integer from 1 to 100",
          context.get("correlationId"),
        ),
        400,
      );
    }

    const cursor = context.req.query("cursor");
    const afterId = cursor ? decodeCursor(cursor) : undefined;
    if (cursor && !afterId) {
      return context.json(
        errorResponse("INVALID_CATALOG_CURSOR", "cursor is invalid", context.get("correlationId")),
        400,
      );
    }

    const bindings: ApiBindings = context.env ?? {};
    const catalogReader =
      options.catalogReader ??
      (bindings.DB ? new D1CatalogReader(bindings.DB) : createDefaultCatalogReader());
    const categorySlug = context.req.query("category");
    const page = await catalogReader.listPublic({
      ...(afterId ? { afterId } : {}),
      ...(categorySlug ? { categorySlug } : {}),
      limit,
    });
    const body: CatalogListResponse = {
      data: {
        categories: [...page.categories],
        items: [...page.items],
        nextCursor: page.nextAfterId ? encodeCursor(page.nextAfterId) : null,
      },
      meta: { correlationId: context.get("correlationId") },
    };

    catalogListResponseSchema.parse(body);
    const cacheVersion =
      bindings.CATALOG_CACHE_VERSION ?? page.cacheVersion ?? options.version ?? "0.0.0";
    const etag = `"catalog-${encodeCursor(`${cacheVersion}:${context.req.url.split("?")[1] ?? ""}`)}"`;
    context.header("cache-control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    context.header("etag", etag);
    context.header("x-catalog-cache-version", cacheVersion);
    if (context.req.header("if-none-match") === etag) {
      return context.body(null, 304);
    }
    return context.json(body, 200);
  });

  app.get("/api/v1/me", (context) => {
    const session = context.get("session");
    if (!session) {
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "authentication is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    const body: CurrentSessionResponse = {
      data: {
        ...toSessionSummary(session),
        adminPermissions: [...session.adminPermissions],
      },
      meta: { correlationId: context.get("correlationId") },
    };

    currentSessionResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.notFound((context) =>
    context.json(errorResponse("NOT_FOUND", "route not found", context.get("correlationId")), 404),
  );

  app.onError((error, context) => {
    const logger = baseLogger.withCorrelationId(context.get("correlationId"));
    const status = error instanceof HTTPException ? error.status : 500;
    const message = error instanceof HTTPException ? error.message : "unexpected server error";

    logger.error("request.failed", error, {
      method: context.req.method,
      path: context.req.path,
      status,
    });

    return context.json(
      errorResponse(
        error instanceof HTTPException ? "HTTP_ERROR" : "INTERNAL_ERROR",
        message,
        context.get("correlationId"),
      ),
      status,
    );
  });

  return app;
}

async function resolveCartResponse(
  lines: readonly { skuId: string; quantity: number }[],
  updatedAt: string | null,
  catalogReader: CatalogCheckoutReader,
  correlationId: string,
): Promise<CartResponse | ApiErrorResponse> {
  const skuIds = lines.map((line) => line.skuId);
  const catalogItems = await catalogReader.findActiveByIds(skuIds);
  if (catalogItems.length !== skuIds.length) {
    return errorResponse("SKU_NOT_AVAILABLE", "one or more SKUs are unavailable", correlationId);
  }
  const catalogById = new Map(catalogItems.map((item) => [item.id, item]));
  let subtotal = createMoney(0);
  const resolvedLines = lines.map((line) => {
    const item = catalogById.get(line.skuId);
    if (!item) {
      throw new Error("SKU_NOT_AVAILABLE");
    }
    subtotal = addMoney(subtotal, multiplyMoney(item.price, line.quantity));
    return { skuId: item.id, quantity: line.quantity, unitPrice: item.price };
  });
  const body: CartResponse = {
    data: { lines: resolvedLines, subtotal, updatedAt },
    meta: { correlationId },
  };
  cartResponseSchema.parse(body);
  return body;
}

function errorResponse(code: string, message: string, correlationId: string): ApiErrorResponse {
  return {
    error: { code, message },
    meta: { correlationId },
  };
}

function encodeCursor(id: string): string {
  return btoa(id).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeCursor(cursor: string): string | undefined {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(cursor)) {
    return undefined;
  }

  try {
    const padded = cursor
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(cursor.length / 4) * 4, "=");
    const decoded = atob(padded);
    return decoded && /^[\x20-\x7e]+$/.test(decoded) ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function resolveDeliveryFeeCentavos(
  configured: number | undefined,
  bindings: ApiBindings,
): number | null {
  const value =
    configured ?? (bindings.DELIVERY_FEE_CENTAVOS ? Number(bindings.DELIVERY_FEE_CENTAVOS) : 0);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}
