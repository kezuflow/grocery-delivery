import { resolveActiveSession, toSessionSummary, type SessionResolver } from "@carbon/auth";
import {
  DefaultSubscriptionCommandService,
  type SubscriptionCommandService,
} from "@carbon/application";
import { parseAllowedOrigins, parseRuntimeEnvironment } from "@carbon/config";
import {
  catalogListResponseSchema,
  type ApiErrorResponse,
  type CatalogListResponse,
  currentSessionResponseSchema,
  type CurrentSessionResponse,
  planAdminUpsertRequestSchema,
  planResponseSchema,
  plansListResponseSchema,
  subscriptionActionRequestSchema,
  subscriptionResponseSchema,
  type SubscriptionResponse,
  type PlansListResponse,
  type HealthResponse,
} from "@carbon/contracts";
import {
  createDefaultCatalogReader,
  createDefaultPlanReader,
  D1CatalogReader,
  D1PlanReader,
  D1PlanRepository,
  D1SubscriptionIdempotencyStore,
  D1SubscriptionRepository,
  type CatalogDatabase,
  type CatalogReader,
  type PlanReader,
  type PlanRepository,
  type SubscriptionReader,
} from "@carbon/db";
import { assignWeeklyCycle, createMoney, createPlan, hasAdminPermission } from "@carbon/domain";
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
  PLAN_CACHE_VERSION?: string;
  VERSION?: string;
}>;

type ApiVariables = {
  correlationId: string;
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
  subscriptionReader?: SubscriptionReader;
  sink?: LogSink;
  sessionResolver?: SessionResolver;
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
    if (!options.sessionResolver || !planRepository) {
      return context.json(
        errorResponse(
          "PLAN_CONFIGURATION_UNAVAILABLE",
          "plan configuration is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const session = await resolveActiveSession(
      options.sessionResolver,
      context.req.raw,
      now().toISOString(),
    );
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
      await planRepository.save(plan, now().toISOString());
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
    if (!options.sessionResolver || !subscriptionService) {
      return context.json(
        errorResponse(
          "SUBSCRIPTION_UNAVAILABLE",
          "subscription actions are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const session = await resolveActiveSession(
      options.sessionResolver,
      context.req.raw,
      now().toISOString(),
    );
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
    if (!options.sessionResolver || !subscriptionReader) {
      return context.json(
        errorResponse(
          "SUBSCRIPTION_UNAVAILABLE",
          "subscription reads are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const session = await resolveActiveSession(
      options.sessionResolver,
      context.req.raw,
      now().toISOString(),
    );
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

  app.get("/api/v1/me", async (context) => {
    if (!options.sessionResolver) {
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "authentication is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    const session = await resolveActiveSession(
      options.sessionResolver,
      context.req.raw,
      now().toISOString(),
    );
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
