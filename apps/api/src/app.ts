import { parseAllowedOrigins, parseRuntimeEnvironment } from "@carbon/config";
import type { ApiErrorResponse, HealthResponse } from "@carbon/contracts";
import { createLogger, resolveCorrelationId, type LogSink } from "@carbon/observability";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";

export type ApiBindings = Readonly<{
  APP_ENV?: string;
  CORS_ORIGINS?: string;
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
  generateCorrelationId?: () => string;
  now?: () => Date;
  sink?: LogSink;
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
