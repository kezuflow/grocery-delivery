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
  CheckoutPricingService,
  evaluateOrderCutoff,
  DefaultPlanApprovalService,
  DefaultSubscriptionCommandService,
  DefaultSubscriptionCreationService,
  InMemoryRequestRateLimiter,
  createOperationalAlerts,
  parseOutboxProcessingMessage,
  resolveEventProcessorKind,
  type OperationalAlertThresholds,
  type CartLockService,
  type PlanApprovalService,
  type RateLimitPolicy,
  type RequestRateLimiter,
  type SubscriptionCommandService,
  type SubscriptionCreationService,
  type PromotionRepository,
  type EventProcessor,
} from "@carbon/application";
import {
  parseAllowedOrigins,
  parseConfiguredOrigin,
  parseRuntimeEnvironment,
} from "@carbon/config";
import {
  catalogListResponseSchema,
  cartResponseSchema,
  cartUpdateRequestSchema,
  type ApiErrorResponse,
  type CartResponse,
  type CatalogListResponse,
  currentSessionResponseSchema,
  deliveryAddressInputSchema,
  deliveryAddressResponseSchema,
  deliveryAddressesResponseSchema,
  savedDeliveryAddressResponseSchema,
  deliveryWindowSelectionRequestSchema,
  deliveryWindowsResponseSchema,
  deliveryEventRequestSchema,
  deliveryEventResponseSchema,
  deliverymanAssignmentsResponseSchema,
  deliverymanEventsResponseSchema,
  deliveryTrackingResponseSchema,
  deliveryMediaUploadRequestSchema,
  deliveryMediaUploadResponseSchema,
  deliveryMediaListResponseSchema,
  dispatchAssignmentRequestSchema,
  dispatchResponseSchema,
  packingManifestRequestSchema,
  procurementPurchaseRequestSchema,
  procurementResponseSchema,
  procurementShortageRequestSchema,
  procurementSubstitutionRequestSchema,
  operationalProjectionResponseSchema,
  type DeliveryWindowsResponse,
  type DeliveryAddressResponse,
  type CurrentSessionResponse,
  planAdminUpsertRequestSchema,
  planApprovalDecisionRequestSchema,
  planChangeRequestResponseSchema,
  planResponseSchema,
  plansListResponseSchema,
  orderCreateRequestSchema,
  orderResponseSchema,
  orderListResponseSchema,
  couponRequestSchema,
  checkoutQuoteResponseSchema,
  paymentAttemptResponseSchema,
  paymentChargeRequestSchema,
  paymentMethodRequestSchema,
  paymentMethodRevocationRequestSchema,
  paymentMethodListResponseSchema,
  paymentMethodResponseSchema,
  paymentHistoryResponseSchema,
  paymentRefundRequestSchema,
  paymentRefundResponseSchema,
  paymentWebhookResponseSchema,
  subscriptionActionRequestSchema,
  subscriptionCreateRequestSchema,
  subscriptionResponseSchema,
  type SubscriptionResponse,
  type PlansListResponse,
  type HealthResponse,
  openApiDocument,
  accountConsentRequestSchema,
  accountExportResponseSchema,
  accountProfileUpdateRequestSchema,
  accountDeletionEligibilityResponseSchema,
  accountDeletionRequestResponseSchema,
  sessionRevokeRequestSchema,
  adminRoleAssignmentRequestSchema,
  adminRoleAssignmentResponseSchema,
  promotionAdminUpsertRequestSchema,
  promotionStatusRequestSchema,
  promotionAdminResponseSchema,
  promotionAdminListResponseSchema,
  promotionBannerAdminListResponseSchema,
  promotionBannerResponseSchema,
  promotionBannerStatusRequestSchema,
  promotionBannerUpsertRequestSchema,
  activePromotionBannersResponseSchema,
  bannerPlacementSchema,
  promotionMediaUploadRequestSchema,
  promotionMediaUploadResponseSchema,
  promotionBannerAnalyticsRequestSchema,
  promotionBannerAnalyticsResponseSchema,
  adminAuditResponseSchema,
  supportCaseCreateRequestSchema,
  supportCaseResponseSchema,
  supportCaseStatusRequestSchema,
  supportCasesResponseSchema,
  notificationPreferencesRequestSchema,
  notificationPreferencesResponseSchema,
  customerOrderRequestCreateSchema,
  customerOrderRequestResponseSchema,
  customerOrderRequestsResponseSchema,
  adminOrderRequestDecisionSchema,
  adminOrderRequestsResponseSchema,
  customerOrderSubstitutionDecisionSchema,
  customerOrderSubstitutionResponseSchema,
  customerOrderSubstitutionsResponseSchema,
} from "@carbon/contracts";
import {
  DefaultPaymentService,
  PaymentProviderError,
  type PaymentProvider,
  type PaymentService,
} from "@carbon/billing";
import {
  createDefaultCatalogReader,
  createDefaultPlanReader,
  D1CartRepository,
  D1CatalogReader,
  D1DeliveryAddressRepository,
  D1DeliveryWindowRepository,
  D1DeliveryEventRepository,
  D1DeliveryTrackingRepository,
  D1DeliveryMediaRepository,
  D1DispatchRepository,
  D1ProcurementRepository,
  D1OperationalProjectionRepository,
  D1OrderRepository,
  D1OutboxPublisher,
  D1PaymentRepository,
  D1IdentityRepository,
  D1PlanApprovalRepository,
  D1PlanReader,
  D1PlanRepository,
  D1SubscriptionIdempotencyStore,
  D1SubscriptionRepository,
  D1PromotionRepository,
  D1PromotionBannerRepository,
  type PromotionBannerRepository,
  D1PromotionBannerAnalyticsRepository,
  D1SupportCaseRepository,
  D1NotificationPreferencesRepository,
  D1CustomerOrderRequestRepository,
  D1CustomerOrderSubstitutionRepository,
  type PromotionBannerAnalyticsRepository,
  type SupportCaseRepository,
  type SupportCase,
  type NotificationPreferencesRepository,
  type CustomerOrderRequestRepository,
  type CustomerOrderSubstitutionRepository,
  InMemoryCartRepository,
  type CartRepository,
  type CatalogDatabase,
  type CatalogReader,
  type CatalogCheckoutReader,
  type PlanLookup,
  type PlanReader,
  type PlanRepository,
  type OrderRepository,
  type SubscriptionReader,
  type DeliveryAddressRepository,
  type DeliveryWindowRepository,
  type DeliveryEventRepository,
  type DeliveryTrackingRepository,
  type DeliveryMediaRepository,
  type DeliveryMediaRecord,
  type DispatchRepository,
  type ProcurementRepository,
  type OperationalProjectionRepository,
  type AccountIdentityRepository,
  type AuditEventReader,
  type IdentityUser,
} from "@carbon/db";
import {
  addMoney,
  assignWeeklyCycle,
  createMoney,
  createDeliveryAddress,
  decideCustomerOrderRequest,
  createDeliveryEvent,
  createDispatchAssignment,
  createPackingManifest,
  createProcurementShortage,
  createProcurementSubstitution,
  createCustomerOrderSubstitution,
  createPlan,
  hasAdminPermission,
  multiplyMoney,
  normalizePromotionCode,
  type Promotion,
  type CustomerOrderSubstitution,
  type Session,
} from "@carbon/domain";
import {
  createLogger,
  resolveCorrelationId,
  type LogSink,
  type MetricsSink,
} from "@carbon/observability";
import type { NotificationSender } from "@carbon/notifications";
import {
  DeterministicMediaSigner,
  DeterministicPromotionMediaSigner,
  verifyMediaRequest,
  type DeliveryMediaSigner,
  type PromotionMediaSigner,
} from "@carbon/storage";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";

export type ApiBindings = Readonly<{
  APP_ENV?: string;
  AUTH_MODE?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  ADMIN_BOOTSTRAP_EMAILS?: string;
  CATALOG_CACHE_VERSION?: string;
  CORS_ORIGINS?: string;
  API_PUBLIC_ORIGIN?: string;
  DB?: CatalogDatabase;
  DELIVERY_FEE_CENTAVOS?: string;
  DELIVERY_SERVICE_POSTAL_CODES?: string;
  PLAN_CACHE_VERSION?: string;
  PAYMENT_PROVIDER?: string;
  PAYMONGO_SECRET_KEY?: string;
  PAYMONGO_API_URL?: string;
  VERSION?: string;
  EVENT_PROCESSOR_TOKEN?: string;
  NOTIFICATION_ENDPOINT?: string;
  NOTIFICATION_TOKEN?: string;
  EMAIL_FROM?: string;
  EMAIL?: {
    send(
      message: Readonly<{
        to: string;
        from: string;
        subject: string;
        text: string;
        html: string;
      }>,
    ): Promise<Readonly<{ messageId: string }>>;
  };
  DELIVERY_MEDIA_RETENTION_DAYS?: string;
  MEDIA_SIGNING_SECRET?: string;
  MEDIA_BUCKET?: R2Bucket;
  MEDIA_BASE_URL?: string;
  PROMOTION_MEDIA_BASE_URL?: string;
  OPERATIONAL_ALERT_PENDING_COUNT?: string;
  OPERATIONAL_ALERT_PENDING_AGE_SECONDS?: string;
  OPERATIONAL_ALERT_DEAD_LETTERED_COUNT?: string;
  OPERATIONAL_ALERT_FAILED_DELIVERY_COUNT?: string;
  OPERATIONAL_ALERT_OPEN_SHORTAGE_COUNT?: string;
  OPERATIONAL_ALERT_EXCEPTIONAL_MANIFEST_COUNT?: string;
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

export type ApiRateLimitPolicy = RateLimitPolicy &
  Readonly<{
    methods: readonly string[];
    pathPrefixes: readonly string[];
  }>;

export type ApiOptions = Readonly<{
  catalogReader?: CatalogReader;
  generateCorrelationId?: () => string;
  now?: () => Date;
  planReader?: PlanReader;
  planRepository?: PlanRepository;
  planApprovalService?: PlanApprovalService;
  catalogCheckoutReader?: CatalogCheckoutReader;
  cartRepository?: CartRepository;
  deliveryAddressRepository?: DeliveryAddressRepository;
  deliveryWindowRepository?: DeliveryWindowRepository;
  procurementRepository?: ProcurementRepository;
  dispatchRepository?: DispatchRepository;
  operationalProjectionRepository?: OperationalProjectionRepository;
  operationalAlertThresholds?: Partial<OperationalAlertThresholds>;
  supportCaseRepository?: SupportCaseRepository;
  notificationPreferencesRepository?: NotificationPreferencesRepository;
  customerOrderRequestRepository?: CustomerOrderRequestRepository;
  customerOrderSubstitutionRepository?: CustomerOrderSubstitutionRepository;
  identityRepository?: AccountIdentityRepository;
  deliveryEventRepository?: DeliveryEventRepository;
  deliveryTrackingRepository?: DeliveryTrackingRepository;
  deliveryMediaRepository?: DeliveryMediaRepository;
  notificationSender?: NotificationSender;
  mediaSigner?: DeliveryMediaSigner;
  promotionMediaSigner?: PromotionMediaSigner;
  promotionBannerRepository?: PromotionBannerRepository;
  promotionBannerAnalyticsRepository?: PromotionBannerAnalyticsRepository;
  auditEventReader?: AuditEventReader;
  serviceablePostalCodes?: readonly string[];
  planLookup?: PlanLookup;
  orderLockService?: CartLockService;
  promotionRepository?: PromotionRepository;
  orderReader?: Pick<
    OrderRepository,
    "findById" | "findByIdIncludingCanceled" | "updatePaymentState" | "listByCustomer" | "cancel"
  >;
  paymentProvider?: PaymentProvider;
  paymentService?: PaymentService;
  deliveryFeeCentavos?: number;
  subscriptionReader?: SubscriptionReader;
  sink?: LogSink;
  sessionResolver?: SessionResolver;
  betterAuthApi?: BetterAuthApi;
  metrics?: MetricsSink;
  rateLimiter?: RequestRateLimiter;
  rateLimitPolicies?: readonly ApiRateLimitPolicy[];
  subscriptionService?: SubscriptionCommandService;
  subscriptionCreationService?: SubscriptionCreationService;
  version?: string;
  eventProcessor?: EventProcessor;
  eventProcessorToken?: string;
}>;

export function createApi(options: ApiOptions = {}): ApiApp {
  const now = options.now ?? (() => new Date());
  const generateCorrelationId = options.generateCorrelationId ?? (() => crypto.randomUUID());
  const sink = options.sink ?? ((entry) => console.log(JSON.stringify(entry)));
  const rateLimiter = options.rateLimiter ?? new InMemoryRequestRateLimiter();
  const rateLimitPolicies = options.rateLimitPolicies ?? defaultRateLimitPolicies;
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

    const startedAt = now().getTime();
    let status = 500;
    try {
      await next();
      status = context.res.status;
    } catch (error) {
      status = error instanceof HTTPException ? error.status : 500;
      throw error;
    } finally {
      logger.info("request.completed", {
        method: context.req.method,
        path: context.req.path,
        status,
      });
      if (options.metrics) {
        try {
          options.metrics({
            name: "api.request",
            correlationId,
            method: context.req.method,
            path: context.req.path,
            status,
            durationMs: Math.max(now().getTime() - startedAt, 0),
          });
        } catch (error) {
          logger.warn("metrics.write.failed", {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
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

  app.use("/api/*", async (context, next) => {
    if (!requiresTrustedOrigin(context.req.method, context.req.path)) {
      await next();
      return;
    }

    const bindings: ApiBindings = context.env ?? {};
    const environment = parseRuntimeEnvironment(bindings.APP_ENV);
    if (environment === "development" || environment === "test") {
      await next();
      return;
    }

    const origin = context.req.header("origin");
    const configuredApiOrigin = parseConfiguredOrigin(
      bindings.API_PUBLIC_ORIGIN,
      "API_PUBLIC_ORIGIN",
      environment,
    );
    const trustedOrigins = new Set([
      ...parseAllowedOrigins(bindings.CORS_ORIGINS, environment),
      ...(configuredApiOrigin ? [configuredApiOrigin] : []),
    ]);
    if (!origin || !trustedOrigins.has(origin)) {
      return context.json(
        errorResponse(
          "ORIGIN_NOT_ALLOWED",
          "a trusted Origin header is required for this request",
          context.get("correlationId"),
        ),
        403,
      );
    }

    await next();
  });

  app.use("/api/*", async (context, next) => {
    const policy = resolveRateLimitPolicy(context.req.method, context.req.path, rateLimitPolicies);
    if (!policy) {
      await next();
      return;
    }

    const clientKey = resolveClientKey(context.req.raw.headers);
    const decision = await rateLimiter.check({
      key: `${policy.name}:${clientKey}`,
      policy,
      now: now(),
    });
    context.header("x-ratelimit-limit", String(decision.limit));
    context.header("x-ratelimit-remaining", String(decision.remaining));
    if (!decision.allowed) {
      context.header("retry-after", String(decision.retryAfterSeconds));
      return context.json(
        errorResponse("RATE_LIMITED", "too many requests", context.get("correlationId")),
        429,
      );
    }
    await next();
  });

  app.all("/api/auth/*", async (context) => {
    if (!options.betterAuthApi?.handler) {
      return context.json(
        errorResponse(
          "AUTH_UNAVAILABLE",
          "authentication is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    return options.betterAuthApi.handler(context.req.raw);
  });

  app.use("/api/v1/*", async (context, next) => {
    const protectedPath =
      context.req.path === "/api/v1/me" ||
      context.req.path.startsWith("/api/v1/account") ||
      context.req.path === "/api/v1/subscription" ||
      context.req.path === "/api/v1/subscription/actions" ||
      context.req.path === "/api/v1/cart" ||
      context.req.path === "/api/v1/delivery-address" ||
      context.req.path.startsWith("/api/v1/delivery-addresses") ||
      context.req.path === "/api/v1/delivery-windows" ||
      context.req.path.startsWith("/api/v1/admin/procurement") ||
      context.req.path.startsWith("/api/v1/admin/dispatch") ||
      context.req.path === "/api/v1/admin/operations/projection" ||
      context.req.path.startsWith("/api/v1/support") ||
      context.req.path === "/api/v1/notification-preferences" ||
      context.req.path.startsWith("/api/v1/deliveryman/") ||
      context.req.path.startsWith("/api/v1/orders/") ||
      context.req.path === "/api/v1/orders" ||
      context.req.path === "/api/v1/order-requests" ||
      context.req.path === "/api/v1/order-substitutions" ||
      context.req.path.startsWith("/api/v1/order-substitutions/") ||
      context.req.path === "/api/v1/payments/charge" ||
      context.req.path === "/api/v1/payments/methods" ||
      context.req.path.startsWith("/api/v1/payments/methods/") ||
      context.req.path === "/api/v1/payments/refund" ||
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

  app.use("/api/v1/*", async (context, next) => {
    if (!requiresMfa(context.req.method, context.req.path)) {
      await next();
      return;
    }
    const session = context.get("session");
    if (session && session.mfaVerified === false) {
      return context.json(
        errorResponse(
          "MFA_REQUIRED",
          "multi-factor authentication is required for this action",
          context.get("correlationId"),
        ),
        403,
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
  app.post("/internal/events/outbox", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const expectedToken = options.eventProcessorToken ?? bindings.EVENT_PROCESSOR_TOKEN;
    const environment = parseRuntimeEnvironment(bindings.APP_ENV);
    if (
      (environment === "staging" || environment === "production") &&
      (!expectedToken || context.req.header("x-event-processor-token") !== expectedToken)
    ) {
      return context.json(
        errorResponse(
          "INTERNAL_UNAUTHORIZED",
          "a valid event processor token is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    if (expectedToken && context.req.header("x-event-processor-token") !== expectedToken) {
      return context.json(
        errorResponse(
          "INTERNAL_UNAUTHORIZED",
          "a valid event processor token is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    if (!options.eventProcessor) {
      return context.json(
        errorResponse(
          "EVENT_PROCESSOR_UNAVAILABLE",
          "event processing is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const requestedKind = context.req.header("x-event-processor");
    if (!requestedKind) {
      return context.json(
        errorResponse(
          "INVALID_EVENT_PROCESSOR",
          "event processor lane is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const message = parseOutboxProcessingMessage(await context.req.json().catch(() => null));
    if (!message) {
      return context.json(
        errorResponse(
          "INVALID_OUTBOX_MESSAGE",
          "outbox message is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    let kind;
    try {
      kind = resolveEventProcessorKind(message.eventType);
    } catch {
      return context.json(
        errorResponse(
          "INVALID_EVENT_PROCESSOR",
          "event type is not supported",
          context.get("correlationId"),
        ),
        400,
      );
    }
    if (requestedKind !== kind) {
      return context.json(
        errorResponse(
          "INVALID_EVENT_PROCESSOR",
          "event processor lane does not match the event type",
          context.get("correlationId"),
        ),
        400,
      );
    }
    try {
      await options.eventProcessor(kind, message);
      return context.json(
        { data: { accepted: true }, meta: { correlationId: context.get("correlationId") } },
        202,
      );
    } catch (error) {
      return context.json(
        errorResponse(
          "EVENT_PROCESSOR_FAILED",
          error instanceof Error ? error.message : "event processing failed",
          context.get("correlationId"),
        ),
        500,
      );
    }
  });
  app.get("/openapi.json", (context) => {
    context.header("cache-control", "public, max-age=300");
    return context.json(openApiDocument, 200);
  });

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

  app.get("/api/v1/promotions/banners", async (context) => {
    const placement = context.req.query("placement");
    const parsedPlacement = bannerPlacementSchema.safeParse(placement);
    if (!parsedPlacement.success) {
      return context.json(
        errorResponse(
          "INVALID_BANNER_PLACEMENT",
          "banner placement is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const repository =
      options.promotionBannerRepository ??
      (context.env?.DB ? new D1PromotionBannerRepository(context.env.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "PROMOTION_BANNERS_UNAVAILABLE",
          "promotion banners are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const at = now().toISOString();
    const banners = await repository.listActive(parsedPlacement.data, at);
    const signer =
      options.promotionMediaSigner ??
      new DeterministicPromotionMediaSigner(context.env?.PROMOTION_MEDIA_BASE_URL);
    const mapped = await Promise.all(
      banners.map(async (banner) => {
        const expiresAt = new Date(now().getTime() + 5 * 60_000).toISOString();
        const [desktop, mobile] = await Promise.all([
          signer.createDownloadUrl({ objectKey: banner.desktopObjectKey, expiresAt }),
          signer.createDownloadUrl({ objectKey: banner.mobileObjectKey, expiresAt }),
        ]);
        return { ...banner, desktopUrl: desktop.downloadUrl, mobileUrl: mobile.downloadUrl };
      }),
    );
    const body = {
      data: {
        placement: parsedPlacement.data,
        banners: mapped,
        cacheVersion: mapped.reduce((max, banner) => Math.max(max, banner.cacheVersion), 1),
      },
      meta: { correlationId: context.get("correlationId") },
    };
    activePromotionBannersResponseSchema.parse(body);
    context.header("cache-control", "public, max-age=60, stale-while-revalidate=300");
    context.header("etag", `W/"banners-${body.data.cacheVersion}"`);
    return context.json(body, 200);
  });

  app.post("/api/v1/promotions/banners/analytics", async (context) => {
    const input = promotionBannerAnalyticsRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_BANNER_ANALYTICS",
          "banner analytics input is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const repository =
      options.promotionBannerAnalyticsRepository ??
      (context.env?.DB ? new D1PromotionBannerAnalyticsRepository(context.env.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "BANNER_ANALYTICS_UNAVAILABLE",
          "banner analytics are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const result = await repository.saveIfActive({
      ...input.data,
      occurredAt: now().toISOString(),
    });
    const body = {
      data: { accepted: result !== "ignored", duplicate: result === "duplicate" },
      meta: { correlationId: context.get("correlationId") },
    };
    promotionBannerAnalyticsResponseSchema.parse(body);
    return context.json(body, 202);
  });

  app.post("/api/v1/admin/identity/roles", async (context) => {
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "superadmin")) {
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "superadmin permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    }
    const input = adminRoleAssignmentRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_ROLE_ASSIGNMENT",
          "role assignment is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const bindings = context.env ?? {};
    const repository =
      options.identityRepository ??
      (bindings.DB ? new D1IdentityRepository(bindings.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "IDENTITY_UNAVAILABLE",
          "identity operations are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const assignedAt = now().toISOString();
    const mfaRequired = input.data.role === "admin";
    const customerId = input.data.role === "customer" ? input.data.userId : null;
    await repository.saveRoleAssignment(
      {
        userId: input.data.userId,
        role: input.data.role,
        adminPermissions: input.data.adminPermissions,
        assignedAt,
      },
      customerId,
      mfaRequired,
    );
    await repository.saveAuditEvent({
      id: await stableIdentityRecordId("role-assignment", input.data.userId, assignedAt),
      actorUserId: session.userId,
      action: "identity.role-assigned",
      targetType: "user",
      targetId: input.data.userId,
      occurredAt: assignedAt,
      metadata: { role: input.data.role, mfaRequired: String(mfaRequired) },
    });
    const body = {
      data: {
        userId: input.data.userId,
        role: input.data.role,
        adminPermissions: [...input.data.adminPermissions],
        mfaRequired,
      },
      meta: { correlationId: context.get("correlationId") },
    };
    adminRoleAssignmentResponseSchema.parse(body);
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

  app.post("/api/v1/subscription", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const planLookup =
      options.planLookup ?? (bindings.DB ? new D1PlanReader(bindings.DB) : undefined);
    const creationService =
      options.subscriptionCreationService ??
      (bindings.DB && planLookup
        ? new DefaultSubscriptionCreationService(
            new D1SubscriptionRepository(bindings.DB),
            new D1SubscriptionIdempotencyStore(bindings.DB),
            planLookup,
          )
        : undefined);
    if (!creationService) {
      return context.json(
        errorResponse(
          "SUBSCRIPTION_UNAVAILABLE",
          "subscription creation is unavailable",
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
    const input = subscriptionCreateRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_PLAN_SELECTION",
          "plan selection is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const idempotencyKey = context.req.header("idempotency-key")?.trim();
    if (!idempotencyKey) {
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
      const subscription = await creationService.execute({
        customerId: session.customerId,
        planId: input.data.planId,
        idempotencyKey,
        now: commandTime.toISOString(),
        cycleId: assignWeeklyCycle(commandTime).id,
      });
      const body: SubscriptionResponse = {
        data: subscription,
        meta: { correlationId: context.get("correlationId") },
      };
      subscriptionResponseSchema.parse(body);
      return context.json(body, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "subscription creation failed";
      const code = message.includes("idempotency")
        ? "IDEMPOTENCY_KEY_REUSED"
        : message.includes("plan is unavailable")
          ? "PLAN_UNAVAILABLE"
          : message.includes("already has")
            ? "SUBSCRIPTION_ALREADY_EXISTS"
            : "INVALID_PLAN_SELECTION";
      return context.json(errorResponse(code, message, context.get("correlationId")), 409);
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
            options.planLookup ?? new D1PlanReader(bindings.DB),
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
          ...(input.data.action === "change-plan" ? { planId: input.data.planId } : {}),
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
          : message.includes("plan is unavailable")
            ? "PLAN_UNAVAILABLE"
            : message.includes("past-due")
              ? "SUBSCRIPTION_PAST_DUE"
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

  app.get("/api/v1/delivery-address", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const repository =
      options.deliveryAddressRepository ??
      (bindings.DB ? new D1DeliveryAddressRepository(bindings.DB) : undefined);
    if (!repository) {
      return context.json(
        errorResponse(
          "DELIVERY_ADDRESS_UNAVAILABLE",
          "delivery address storage is unavailable",
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
    const address = await repository.findByCustomerId(session.customerId);
    const body: DeliveryAddressResponse = {
      data: address
        ? toDeliveryAddressData(
            address,
            resolveServiceability(address.postalCode, options, bindings),
          )
        : null,
      meta: { correlationId: context.get("correlationId") },
    };
    deliveryAddressResponseSchema.parse(body);
    context.header("cache-control", "private, no-store");
    return context.json(body, 200);
  });

  app.put("/api/v1/delivery-address", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const repository =
      options.deliveryAddressRepository ??
      (bindings.DB ? new D1DeliveryAddressRepository(bindings.DB) : undefined);
    if (!repository) {
      return context.json(
        errorResponse(
          "DELIVERY_ADDRESS_UNAVAILABLE",
          "delivery address storage is unavailable",
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
    const input = deliveryAddressInputSchema.safeParse(await context.req.json().catch(() => null));
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_DELIVERY_ADDRESS",
          "delivery address fields are invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    try {
      const existing = await repository.findByCustomerId(session.customerId);
      const timestamp = now().toISOString();
      const address = createDeliveryAddress({
        ...input.data,
        customerId: session.customerId,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
      const serviceable = resolveServiceability(address.postalCode, options, bindings);
      if (!serviceable) {
        return context.json(
          errorResponse(
            "DELIVERY_ADDRESS_UNSERVICEABLE",
            "delivery is not currently available for this postal code",
            context.get("correlationId"),
          ),
          409,
        );
      }
      await repository.save(address);
      const body: DeliveryAddressResponse = {
        data: toDeliveryAddressData(address, serviceable),
        meta: { correlationId: context.get("correlationId") },
      };
      deliveryAddressResponseSchema.parse(body);
      context.header("cache-control", "private, no-store");
      return context.json(body, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "delivery address is invalid";
      return context.json(
        errorResponse("INVALID_DELIVERY_ADDRESS", message, context.get("correlationId")),
        400,
      );
    }
  });

  app.get("/api/v1/delivery-addresses", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const repository =
      options.deliveryAddressRepository ??
      (bindings.DB ? new D1DeliveryAddressRepository(bindings.DB) : undefined);
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
    if (!repository) {
      return context.json(
        errorResponse(
          "DELIVERY_ADDRESS_UNAVAILABLE",
          "delivery address storage is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const addresses = (await repository.listByCustomer(session.customerId)).map((saved) => ({
      id: saved.id,
      selected: saved.selected,
      ...toDeliveryAddressData(
        saved.address,
        resolveServiceability(saved.address.postalCode, options, bindings),
      ),
    }));
    const body = {
      data: { addresses },
      meta: { correlationId: context.get("correlationId") },
    };
    deliveryAddressesResponseSchema.parse(body);
    context.header("cache-control", "private, no-store");
    return context.json(body, 200);
  });

  app.post("/api/v1/delivery-addresses", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const repository =
      options.deliveryAddressRepository ??
      (bindings.DB ? new D1DeliveryAddressRepository(bindings.DB) : undefined);
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
    if (!repository) {
      return context.json(
        errorResponse(
          "DELIVERY_ADDRESS_UNAVAILABLE",
          "delivery address storage is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const idempotencyKey = context.req.header("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 128) {
      return context.json(
        errorResponse(
          "MISSING_IDEMPOTENCY_KEY",
          "a valid Idempotency-Key is required",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const input = deliveryAddressInputSchema.safeParse(await context.req.json().catch(() => null));
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_DELIVERY_ADDRESS",
          "delivery address fields are invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const existingAddresses = await repository.listByCustomer(session.customerId);
    const id = `address:${session.customerId}:${idempotencyKey}`;
    const existing = existingAddresses.find((saved) => saved.id === id);
    if (existing) {
      const fingerprint = JSON.stringify(input.data);
      const existingFingerprint = JSON.stringify({
        recipientName: existing.address.recipientName,
        phone: existing.address.phone,
        line1: existing.address.line1,
        line2: existing.address.line2,
        barangay: existing.address.barangay,
        city: existing.address.city,
        province: existing.address.province,
        postalCode: existing.address.postalCode,
        instructions: existing.address.instructions,
      });
      if (fingerprint !== existingFingerprint) {
        return context.json(
          errorResponse(
            "IDEMPOTENCY_CONFLICT",
            "idempotency key was already used for a different address",
            context.get("correlationId"),
          ),
          409,
        );
      }
      const body = {
        data: {
          id: existing.id,
          selected: existing.selected,
          ...toDeliveryAddressData(
            existing.address,
            resolveServiceability(existing.address.postalCode, options, bindings),
          ),
        },
        meta: { correlationId: context.get("correlationId") },
      };
      savedDeliveryAddressResponseSchema.parse(body);
      return context.json(body, 200);
    }
    const timestamp = now().toISOString();
    const address = createDeliveryAddress({
      ...input.data,
      customerId: session.customerId,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    const serviceable = resolveServiceability(address.postalCode, options, bindings);
    if (!serviceable) {
      return context.json(
        errorResponse(
          "DELIVERY_ADDRESS_UNSERVICEABLE",
          "delivery is not currently available for this postal code",
          context.get("correlationId"),
        ),
        409,
      );
    }
    const selected = existingAddresses.length === 0;
    await repository.saveAddress({ id, address, selected });
    const body = {
      data: { id, selected, ...toDeliveryAddressData(address, serviceable) },
      meta: { correlationId: context.get("correlationId") },
    };
    savedDeliveryAddressResponseSchema.parse(body);
    return context.json(body, 201);
  });

  app.put("/api/v1/delivery-addresses/:id/select", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const repository =
      options.deliveryAddressRepository ??
      (bindings.DB ? new D1DeliveryAddressRepository(bindings.DB) : undefined);
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
    if (!repository) {
      return context.json(
        errorResponse(
          "DELIVERY_ADDRESS_UNAVAILABLE",
          "delivery address storage is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const selected = await repository.select(
      session.customerId,
      context.req.param("id"),
      now().toISOString(),
    );
    if (!selected) {
      return context.json(
        errorResponse(
          "DELIVERY_ADDRESS_NOT_FOUND",
          "address was not found",
          context.get("correlationId"),
        ),
        404,
      );
    }
    const saved = (await repository.listByCustomer(session.customerId)).find(
      (address) => address.id === context.req.param("id"),
    );
    if (!saved) {
      return context.json(
        errorResponse(
          "DELIVERY_ADDRESS_NOT_FOUND",
          "address was not found",
          context.get("correlationId"),
        ),
        404,
      );
    }
    const body = {
      data: {
        id: saved.id,
        selected: true,
        ...toDeliveryAddressData(
          saved.address,
          resolveServiceability(saved.address.postalCode, options, bindings),
        ),
      },
      meta: { correlationId: context.get("correlationId") },
    };
    savedDeliveryAddressResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.get("/api/v1/delivery-windows", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const repository =
      options.deliveryWindowRepository ??
      (bindings.DB ? new D1DeliveryWindowRepository(bindings.DB) : undefined);
    if (!repository) {
      return context.json(
        errorResponse(
          "DELIVERY_WINDOWS_UNAVAILABLE",
          "delivery windows are unavailable",
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
    const cycle = assignWeeklyCycle(now());
    const windows = await repository.listForCycle(cycle.id);
    const selected = await repository.findSelection(session.customerId, cycle.id);
    const body: DeliveryWindowsResponse = {
      data: {
        cycleId: cycle.id,
        cutoffAt: cycle.cutoffAt,
        windows: windows.map((window) => ({
          id: window.id,
          cycleId: window.cycleId,
          label: window.label,
          startsAt: window.startsAt,
          endsAt: window.endsAt,
          capacity: window.capacity,
          reserved: window.reserved,
          remaining: window.remaining,
          active: window.active,
        })),
        selectedWindowId: selected?.windowId ?? null,
      },
      meta: { correlationId: context.get("correlationId") },
    };
    deliveryWindowsResponseSchema.parse(body);
    context.header("cache-control", "private, no-store");
    return context.json(body, 200);
  });

  app.put("/api/v1/delivery-windows", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const repository =
      options.deliveryWindowRepository ??
      (bindings.DB ? new D1DeliveryWindowRepository(bindings.DB) : undefined);
    if (!repository) {
      return context.json(
        errorResponse(
          "DELIVERY_WINDOWS_UNAVAILABLE",
          "delivery windows are unavailable",
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
    const input = deliveryWindowSelectionRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_DELIVERY_WINDOW",
          "delivery window selection is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const cycle = assignWeeklyCycle(now());
    try {
      await repository.select({
        customerId: session.customerId,
        cycleId: cycle.id,
        windowId: input.data.windowId,
        selectedAt: now().toISOString(),
      });
      const selected = await repository.findSelection(session.customerId, cycle.id);
      if (!selected) throw new Error("delivery window selection was not saved");
      return context.json(
        {
          data: {
            cycleId: cycle.id,
            cutoffAt: cycle.cutoffAt,
            windows: [],
            selectedWindowId: selected.windowId,
          },
          meta: { correlationId: context.get("correlationId") },
        },
        200,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "delivery window selection failed";
      return context.json(
        errorResponse("DELIVERY_WINDOW_UNAVAILABLE", message, context.get("correlationId")),
        409,
      );
    }
  });

  app.get("/api/v1/admin/procurement", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.procurementRepository ??
      (bindings.DB ? new D1ProcurementRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "procurement"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "procurement administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "PROCUREMENT_UNAVAILABLE",
          "procurement is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const cycle = assignWeeklyCycle(now());
    const body = {
      data: {
        cycleId: cycle.id,
        demand: await repository.listDemand(cycle.id),
        shortages: await repository.listShortages(cycle.id),
        substitutions: await repository.listSubstitutions(cycle.id),
        manifests: await repository.listManifests(cycle.id),
      },
      meta: { correlationId: context.get("correlationId") },
    };
    procurementResponseSchema.parse(body);
    return context.json(body, 200);
  });
  app.put("/api/v1/admin/procurement/purchases", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.procurementRepository ??
      (bindings.DB ? new D1ProcurementRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "procurement"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "procurement administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "PROCUREMENT_UNAVAILABLE",
          "procurement is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const input = procurementPurchaseRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_PROCUREMENT",
          "purchase input is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const cycle = assignWeeklyCycle(now());
    await repository.savePurchase(
      cycle.id,
      input.data.skuId,
      input.data.purchasedQuantity,
      now().toISOString(),
    );
    return context.json(
      {
        data: {
          cycleId: cycle.id,
          demand: await repository.listDemand(cycle.id),
          shortages: await repository.listShortages(cycle.id),
          substitutions: await repository.listSubstitutions(cycle.id),
          manifests: await repository.listManifests(cycle.id),
        },
        meta: { correlationId: context.get("correlationId") },
      },
      200,
    );
  });
  app.post("/api/v1/admin/procurement/shortages", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.procurementRepository ??
      (bindings.DB ? new D1ProcurementRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "procurement"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "procurement administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "PROCUREMENT_UNAVAILABLE",
          "procurement is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const input = procurementShortageRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_SHORTAGE",
          "shortage input is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const cycle = assignWeeklyCycle(now());
    await repository.saveShortage(
      createProcurementShortage({
        id: crypto.randomUUID(),
        cycleId: cycle.id,
        skuId: input.data.skuId,
        requestedQuantity: input.data.requestedQuantity,
        availableQuantity: input.data.availableQuantity,
        status: "open",
        createdAt: now().toISOString(),
      }),
    );
    return context.json(
      {
        data: {
          cycleId: cycle.id,
          demand: await repository.listDemand(cycle.id),
          shortages: await repository.listShortages(cycle.id),
          substitutions: await repository.listSubstitutions(cycle.id),
          manifests: await repository.listManifests(cycle.id),
        },
        meta: { correlationId: context.get("correlationId") },
      },
      200,
    );
  });
  app.post("/api/v1/admin/procurement/substitutions", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.procurementRepository ??
      (bindings.DB ? new D1ProcurementRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "procurement"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "procurement administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "PROCUREMENT_UNAVAILABLE",
          "procurement is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const input = procurementSubstitutionRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_SUBSTITUTION",
          "substitution input is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const shortages = await repository.listShortages(assignWeeklyCycle(now()).id);
    const shortage = shortages.find((value) => value.id === input.data.shortageId);
    if (!shortage)
      return context.json(
        errorResponse("SHORTAGE_NOT_FOUND", "shortage was not found", context.get("correlationId")),
        404,
      );
    if (input.data.orderId && input.data.status !== "proposed") {
      return context.json(
        errorResponse(
          "INVALID_SUBSTITUTION_STATUS",
          "customer-targeted substitutions must begin as proposed",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const procurementSubstitution = createProcurementSubstitution({
      id: crypto.randomUUID(),
      shortageId: shortage.id,
      originalSkuId: shortage.skuId,
      substituteSkuId: input.data.substituteSkuId,
      quantity: input.data.quantity,
      status: input.data.status,
      approvedAt: input.data.status === "approved" ? now().toISOString() : null,
    });
    if (input.data.orderId) {
      const orderReader =
        options.orderReader ?? (bindings.DB ? new D1OrderRepository(bindings.DB) : undefined);
      const customerSubstitutionRepository =
        options.customerOrderSubstitutionRepository ??
        (bindings.DB ? new D1CustomerOrderSubstitutionRepository(bindings.DB) : undefined);
      const order = orderReader ? await orderReader.findById(input.data.orderId) : null;
      const line = order?.cart.lines.find((value) => value.skuId === shortage.skuId);
      if (
        !order ||
        order.cycleId !== shortage.cycleId ||
        !line ||
        input.data.quantity > line.quantity
      ) {
        return context.json(
          errorResponse(
            "INVALID_SUBSTITUTION_ORDER",
            "the substitution order or quantity is invalid",
            context.get("correlationId"),
          ),
          400,
        );
      }
      if (!customerSubstitutionRepository) {
        return context.json(
          errorResponse(
            "ORDER_SUBSTITUTIONS_UNAVAILABLE",
            "customer substitutions are unavailable",
            context.get("correlationId"),
          ),
          503,
        );
      }
      const existingProposals = await customerSubstitutionRepository.listByCustomer(
        order.customerId,
      );
      if (
        existingProposals.some(
          (proposal) =>
            proposal.orderId === order.id &&
            proposal.originalSkuId === shortage.skuId &&
            proposal.status === "pending",
        )
      ) {
        return context.json(
          errorResponse(
            "SUBSTITUTION_ALREADY_PENDING",
            "a substitution decision is already pending for this order item",
            context.get("correlationId"),
          ),
          409,
        );
      }
      await repository.saveSubstitution(procurementSubstitution);
      const createdAt = now().toISOString();
      await customerSubstitutionRepository.save(
        createCustomerOrderSubstitution({
          id: crypto.randomUUID(),
          customerId: order.customerId,
          orderId: order.id,
          shortageId: shortage.id,
          originalSkuId: shortage.skuId,
          procurementSubstitutionId: procurementSubstitution.id,
          substituteSkuId: input.data.substituteSkuId,
          quantity: input.data.quantity,
          status: "pending",
          idempotencyKey: null,
          requestFingerprint: null,
          decidedAt: null,
          createdAt,
          updatedAt: createdAt,
        }),
      );
    } else {
      await repository.saveSubstitution(procurementSubstitution);
    }
    const cycle = assignWeeklyCycle(now());
    return context.json(
      {
        data: {
          cycleId: cycle.id,
          demand: await repository.listDemand(cycle.id),
          shortages: await repository.listShortages(cycle.id),
          substitutions: await repository.listSubstitutions(cycle.id),
          manifests: await repository.listManifests(cycle.id),
        },
        meta: { correlationId: context.get("correlationId") },
      },
      200,
    );
  });
  app.post("/api/v1/admin/packing/manifests", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.procurementRepository ??
      (bindings.DB ? new D1ProcurementRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "packing"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "packing administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "PACKING_UNAVAILABLE",
          "packing is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const input = packingManifestRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse("INVALID_PACKING", "manifest input is invalid", context.get("correlationId")),
        400,
      );
    const cycle = assignWeeklyCycle(now());
    await repository.saveManifest(
      createPackingManifest({
        id: crypto.randomUUID(),
        cycleId: cycle.id,
        orderId: input.data.orderId,
        status: input.data.status,
        createdAt: now().toISOString(),
      }),
    );
    return context.json(
      {
        data: {
          cycleId: cycle.id,
          demand: await repository.listDemand(cycle.id),
          shortages: await repository.listShortages(cycle.id),
          substitutions: await repository.listSubstitutions(cycle.id),
          manifests: await repository.listManifests(cycle.id),
        },
        meta: { correlationId: context.get("correlationId") },
      },
      200,
    );
  });
  app.get("/api/v1/notification-preferences", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.notificationPreferencesRepository ??
      (bindings.DB ? new D1NotificationPreferencesRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session?.customerId)
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "NOTIFICATIONS_UNAVAILABLE",
          "notification preferences are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const value = (await repository.get(session.customerId)) ?? {
      customerId: session.customerId,
      deliveryUpdates: true,
      marketing: false,
      updatedAt: now().toISOString(),
    };
    const body = { data: value, meta: { correlationId: context.get("correlationId") } };
    notificationPreferencesResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.put("/api/v1/notification-preferences", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.notificationPreferencesRepository ??
      (bindings.DB ? new D1NotificationPreferencesRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session?.customerId)
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "NOTIFICATIONS_UNAVAILABLE",
          "notification preferences are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const input = notificationPreferencesRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_NOTIFICATION_PREFERENCES",
          "notification preferences are invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const value = await repository.save({
      customerId: session.customerId,
      ...input.data,
      updatedAt: now().toISOString(),
    });
    await saveOptionalAudit(options.identityRepository, bindings, {
      actorUserId: session.userId,
      action: "notification_preferences.updated",
      targetType: "customer",
      targetId: session.customerId,
      occurredAt: value.updatedAt,
      metadata: { correlationId: context.get("correlationId") },
    });
    const body = { data: value, meta: { correlationId: context.get("correlationId") } };
    notificationPreferencesResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.get("/api/v1/support/cases", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.supportCaseRepository ??
      (bindings.DB ? new D1SupportCaseRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!repository) {
      return context.json(
        errorResponse(
          "SUPPORT_UNAVAILABLE",
          "support cases are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    if (!session || !session.customerId) {
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    const cases = await repository.listByCustomer(session.customerId);
    const body = {
      data: { cases: cases.map(toSupportCaseData) },
      meta: { correlationId: context.get("correlationId") },
    };
    supportCasesResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.post("/api/v1/support/cases", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.supportCaseRepository ??
      (bindings.DB ? new D1SupportCaseRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!repository) {
      return context.json(
        errorResponse(
          "SUPPORT_UNAVAILABLE",
          "support cases are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    if (!session || !session.customerId) {
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    const idempotencyKey = context.req.header("idempotency-key")?.trim();
    if (!idempotencyKey) {
      return context.json(
        errorResponse(
          "MISSING_IDEMPOTENCY_KEY",
          "Idempotency-Key is required",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const input = supportCaseCreateRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_SUPPORT_CASE",
          "support case input is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const existing = await repository.findByIdempotency(session.customerId, idempotencyKey);
    if (existing) {
      const body = {
        data: toSupportCaseData(existing),
        meta: { correlationId: context.get("correlationId") },
      };
      supportCaseResponseSchema.parse(body);
      return context.json(body, 200);
    }
    const timestamp = now().toISOString();
    const record = {
      id: crypto.randomUUID(),
      customerId: session.customerId,
      subject: input.data.subject,
      message: input.data.message,
      status: "open" as const,
      idempotencyKey,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await repository.save(record);
    await saveOptionalAudit(options.identityRepository, bindings, {
      actorUserId: session.userId,
      action: "support_case.created",
      targetType: "support_case",
      targetId: record.id,
      occurredAt: timestamp,
      metadata: { correlationId: context.get("correlationId") },
    });
    const body = {
      data: toSupportCaseData(record),
      meta: { correlationId: context.get("correlationId") },
    };
    supportCaseResponseSchema.parse(body);
    return context.json(body, 201);
  });

  app.get("/api/v1/admin/support/cases", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.supportCaseRepository ??
      (bindings.DB ? new D1SupportCaseRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "support")) {
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "support administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    }
    if (!repository) {
      return context.json(
        errorResponse(
          "SUPPORT_UNAVAILABLE",
          "support cases are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const cases = await repository.listAll();
    const body = {
      data: { cases: cases.map(toSupportCaseData) },
      meta: { correlationId: context.get("correlationId") },
    };
    supportCasesResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.patch("/api/v1/admin/support/cases/:id/status", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.supportCaseRepository ??
      (bindings.DB ? new D1SupportCaseRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "support")) {
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "support administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    }
    if (!repository) {
      return context.json(
        errorResponse(
          "SUPPORT_UNAVAILABLE",
          "support cases are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const input = supportCaseStatusRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_SUPPORT_STATUS",
          "support status is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const updated = await repository.updateStatus(
      context.req.param("id"),
      input.data.status,
      now().toISOString(),
    );
    if (!updated) {
      return context.json(
        errorResponse(
          "SUPPORT_CASE_NOT_FOUND",
          "support case was not found",
          context.get("correlationId"),
        ),
        404,
      );
    }
    await saveOptionalAudit(options.identityRepository, bindings, {
      actorUserId: session.userId,
      action: "support_case.status_updated",
      targetType: "support_case",
      targetId: updated.id,
      occurredAt: updated.updatedAt,
      metadata: { status: updated.status, correlationId: context.get("correlationId") },
    });
    const body = {
      data: toSupportCaseData(updated),
      meta: { correlationId: context.get("correlationId") },
    };
    supportCaseResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.get("/api/v1/admin/operations/projection", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.operationalProjectionRepository ??
      (bindings.DB ? new D1OperationalProjectionRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "reporting")) {
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "reporting administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    }
    if (!repository) {
      return context.json(
        errorResponse(
          "OPERATIONS_UNAVAILABLE",
          "operational projections are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const cycleId = assignWeeklyCycle(now()).id;
    const projection = await repository.get(cycleId, now().toISOString());
    const body = {
      data: {
        ...projection,
        alerts: createOperationalAlerts(projection, {
          ...readOperationalAlertThresholds(bindings),
          ...options.operationalAlertThresholds,
        }),
      },
      meta: { correlationId: context.get("correlationId") },
    };
    operationalProjectionResponseSchema.parse(body);
    context.header("cache-control", "private, no-store");
    return context.json(body, 200);
  });

  app.get("/api/v1/admin/audit", async (context) => {
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "reporting"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "reporting administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    const repository =
      options.auditEventReader ??
      (context.env?.DB ? new D1IdentityRepository(context.env.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "AUDIT_UNAVAILABLE",
          "audit history is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const requested = Number(context.req.query("limit") ?? 50);
    const limit = Number.isSafeInteger(requested) ? Math.min(100, Math.max(1, requested)) : 50;
    const body = {
      data: { events: await repository.listAuditEvents(limit) },
      meta: { correlationId: context.get("correlationId") },
    };
    adminAuditResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.get("/api/v1/admin/dispatch", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.dispatchRepository ??
      (bindings.DB ? new D1DispatchRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "dispatch"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "dispatch administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "DISPATCH_UNAVAILABLE",
          "dispatch is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const cycle = assignWeeklyCycle(now());
    const body = {
      data: { cycleId: cycle.id, assignments: await repository.list(cycle.id) },
      meta: { correlationId: context.get("correlationId") },
    };
    dispatchResponseSchema.parse(body);
    return context.json(body, 200);
  });
  app.post("/api/v1/admin/dispatch", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.dispatchRepository ??
      (bindings.DB ? new D1DispatchRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "dispatch"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "dispatch administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "DISPATCH_UNAVAILABLE",
          "dispatch is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const input = dispatchAssignmentRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_DISPATCH",
          "assignment input is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const cycle = assignWeeklyCycle(now());
    const windowRepository =
      options.deliveryWindowRepository ??
      (bindings.DB ? new D1DeliveryWindowRepository(bindings.DB) : undefined);
    const orderReader =
      options.orderReader ?? (bindings.DB ? new D1OrderRepository(bindings.DB) : undefined);
    if (windowRepository) {
      const windows = await windowRepository.listForCycle(cycle.id);
      if (!windows.some((window) => window.id === input.data.windowId))
        return context.json(
          errorResponse(
            "INVALID_DISPATCH_WINDOW",
            "dispatch window is not active for the current cycle",
            context.get("correlationId"),
          ),
          400,
        );
    }
    if (orderReader) {
      const order = await orderReader.findById(input.data.orderId);
      if (!order) {
        return context.json(
          errorResponse("ORDER_NOT_FOUND", "order was not found", context.get("correlationId")),
          404,
        );
      }
      if (order.cycleId !== cycle.id) {
        return context.json(
          errorResponse(
            "DISPATCH_CYCLE_MISMATCH",
            "order belongs to a different delivery cycle",
            context.get("correlationId"),
          ),
          409,
        );
      }
      if (order.deliveryWindow && order.deliveryWindow.id !== input.data.windowId) {
        return context.json(
          errorResponse(
            "DISPATCH_WINDOW_MISMATCH",
            "assignment window does not match the order snapshot",
            context.get("correlationId"),
          ),
          409,
        );
      }
      if (order.paymentState !== "paid") {
        return context.json(
          errorResponse(
            "ORDER_NOT_PAYABLE",
            "a paid order is required for dispatch",
            context.get("correlationId"),
          ),
          409,
        );
      }
      const procurementRepository =
        options.procurementRepository ??
        (bindings.DB ? new D1ProcurementRepository(bindings.DB) : undefined);
      if (procurementRepository) {
        const manifest = (await procurementRepository.listManifests(order.cycleId)).find(
          (candidate) => candidate.orderId === order.id,
        );
        if (!manifest || manifest.status !== "packed") {
          return context.json(
            errorResponse(
              "ORDER_NOT_PACKED",
              "a packed order is required for dispatch",
              context.get("correlationId"),
            ),
            409,
          );
        }
      }
    }
    const assignment = createDispatchAssignment({
      id: crypto.randomUUID(),
      cycleId: cycle.id,
      orderId: input.data.orderId,
      windowId: input.data.windowId,
      deliverymanUserId: input.data.deliverymanUserId,
      status: "assigned",
      assignedAt: now().toISOString(),
    });
    await repository.save(assignment);
    await saveOptionalAudit(options.identityRepository, bindings, {
      actorUserId: session.userId,
      action: "dispatch.assignment-created",
      targetType: "dispatch_assignment",
      targetId: assignment.id,
      occurredAt: assignment.assignedAt,
      metadata: {
        orderId: assignment.orderId,
        deliverymanUserId: assignment.deliverymanUserId,
        cycleId: assignment.cycleId,
        correlationId: context.get("correlationId"),
      },
    });
    return context.json(
      {
        data: { cycleId: cycle.id, assignments: await repository.list(cycle.id) },
        meta: { correlationId: context.get("correlationId") },
      },
      200,
    );
  });

  app.get("/api/v1/deliveryman/assignments", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.deliveryEventRepository ??
      (bindings.DB ? new D1DeliveryEventRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || session.role !== "deliveryman")
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "an active deliveryman session is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "DELIVERYMAN_UNAVAILABLE",
          "deliveryman operations are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const cycle = assignWeeklyCycle(now());
    const body = {
      data: {
        cycleId: cycle.id,
        assignments: (await repository.listAssignments(session.userId, cycle.id)).map(
          (assignment) => ({
            ...assignment,
            routeSequence: assignment.routeSequence ?? 1,
            recipientName: assignment.recipientName ?? null,
            recipientPhone: assignment.recipientPhone ?? null,
            deliveryAddress: assignment.deliveryAddress ?? null,
          }),
        ),
      },
      meta: { correlationId: context.get("correlationId") },
    };
    deliverymanAssignmentsResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.get("/api/v1/deliveryman/assignments/:id/events", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.deliveryEventRepository ??
      (bindings.DB ? new D1DeliveryEventRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || session.role !== "deliveryman")
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "an active deliveryman session is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "DELIVERYMAN_UNAVAILABLE",
          "deliveryman operations are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const body = {
      data: await repository.listEvents(context.req.param("id"), session.userId),
      meta: { correlationId: context.get("correlationId") },
    };
    deliverymanEventsResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.post("/api/v1/deliveryman/events", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.deliveryEventRepository ??
      (bindings.DB ? new D1DeliveryEventRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || session.role !== "deliveryman")
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "an active deliveryman session is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "DELIVERYMAN_UNAVAILABLE",
          "deliveryman operations are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const input = deliveryEventRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_DELIVERY_EVENT",
          "delivery event is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    try {
      const event = await repository.saveEvent(
        createDeliveryEvent({
          id: crypto.randomUUID(),
          clientEventId: input.data.clientEventId,
          assignmentId: input.data.assignmentId,
          orderId: input.data.orderId,
          deliverymanUserId: session.userId,
          type: input.data.type,
          occurredAt: input.data.occurredAt,
          receivedAt: now().toISOString(),
          note: input.data.note,
          failureReason: input.data.failureReason,
        }),
      );
      if (options.notificationSender) {
        const customerId = options.deliveryTrackingRepository
          ? await options.deliveryTrackingRepository.findCustomerId(event.orderId)
          : null;
        if (customerId) {
          await options.notificationSender.send({
            id: `delivery-notification:${event.id}`,
            idempotencyKey: `delivery-event:${event.id}`,
            customerId,
            orderId: event.orderId,
            type: "delivery_update",
            eventType: event.type,
            occurredAt: event.occurredAt,
          });
        }
      }
      const body = { data: event, meta: { correlationId: context.get("correlationId") } };
      deliveryEventResponseSchema.parse(body);
      return context.json(body, 200);
    } catch (error) {
      return context.json(
        errorResponse(
          "DELIVERY_EVENT_REJECTED",
          error instanceof Error ? error.message : "delivery event was rejected",
          context.get("correlationId"),
        ),
        409,
      );
    }
  });

  app.get("/api/v1/orders/:id/tracking", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.deliveryTrackingRepository ??
      (bindings.DB ? new D1DeliveryTrackingRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || session.role !== "customer" || !session.customerId)
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository)
      return context.json(
        errorResponse(
          "TRACKING_UNAVAILABLE",
          "tracking is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const tracking = await repository.get(context.req.param("id"), session.customerId);
    if (!tracking)
      return context.json(
        errorResponse("ORDER_NOT_FOUND", "order was not found", context.get("correlationId")),
        404,
      );
    const body = { data: tracking, meta: { correlationId: context.get("correlationId") } };
    deliveryTrackingResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.get("/api/v1/orders", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.orderReader ?? (bindings.DB ? new D1OrderRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || session.role !== "customer" || !session.customerId)
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        401,
      );
    if (!repository?.listByCustomer)
      return context.json(
        errorResponse(
          "ORDERS_UNAVAILABLE",
          "order history is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const orders = await repository.listByCustomer(session.customerId);
    const body = {
      data: {
        orders: orders.map((order) => ({
          id: order.id,
          subscriptionId: order.subscriptionId,
          planId: order.planId,
          cycleId: order.cycleId,
          lines: order.cart.lines,
          weeklyCredit: order.weeklyCredit,
          totals: order.totals,
          appliedPromotion: order.appliedPromotion ?? null,
          deliveryAddress: order.deliveryAddress
            ? {
                recipientName: order.deliveryAddress.recipientName,
                phone: order.deliveryAddress.phone,
                line1: order.deliveryAddress.line1,
                line2: order.deliveryAddress.line2,
                barangay: order.deliveryAddress.barangay,
                city: order.deliveryAddress.city,
                province: order.deliveryAddress.province,
                postalCode: order.deliveryAddress.postalCode,
                instructions: order.deliveryAddress.instructions,
              }
            : null,
          deliveryWindow: order.deliveryWindow
            ? {
                id: order.deliveryWindow.id,
                cycleId: order.deliveryWindow.cycleId,
                label: order.deliveryWindow.label,
                startsAt: order.deliveryWindow.startsAt,
                endsAt: order.deliveryWindow.endsAt,
              }
            : null,
          paymentState: order.paymentState ?? "unpaid",
          status: order.status,
          lockedAt: order.lockedAt,
        })),
      },
      meta: { correlationId: context.get("correlationId") },
    };
    orderListResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.get("/api/v1/order-requests", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.customerOrderRequestRepository ??
      (bindings.DB ? new D1CustomerOrderRequestRepository(bindings.DB) : undefined);
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
    if (!repository) {
      return context.json(
        errorResponse(
          "ORDER_REQUESTS_UNAVAILABLE",
          "order requests are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const body = {
      data: { requests: await repository.listByCustomer(session.customerId) },
      meta: { correlationId: context.get("correlationId") },
    };
    customerOrderRequestsResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.post("/api/v1/order-requests", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.customerOrderRequestRepository ??
      (bindings.DB ? new D1CustomerOrderRequestRepository(bindings.DB) : undefined);
    const orderReader =
      options.orderReader ?? (bindings.DB ? new D1OrderRepository(bindings.DB) : undefined);
    const dispatchRepository =
      options.dispatchRepository ??
      (bindings.DB ? new D1DispatchRepository(bindings.DB) : undefined);
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
    if (!repository || !orderReader) {
      return context.json(
        errorResponse(
          "ORDER_REQUESTS_UNAVAILABLE",
          "order requests are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const idempotencyKey = context.req.header("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 128) {
      return context.json(
        errorResponse(
          "MISSING_IDEMPOTENCY_KEY",
          "a valid Idempotency-Key is required",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const input = customerOrderRequestCreateSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_ORDER_REQUEST",
          "order request input is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const fingerprint = JSON.stringify(input.data);
    const existing = await repository.findByIdempotency(session.customerId, idempotencyKey);
    if (existing) {
      if (existing.requestFingerprint !== fingerprint) {
        return context.json(
          errorResponse(
            "IDEMPOTENCY_CONFLICT",
            "idempotency key was already used for a different order request",
            context.get("correlationId"),
          ),
          409,
        );
      }
      const body = { data: existing, meta: { correlationId: context.get("correlationId") } };
      customerOrderRequestResponseSchema.parse(body);
      return context.json(body, 200);
    }
    const order = orderReader.findByIdIncludingCanceled
      ? await orderReader.findByIdIncludingCanceled(input.data.orderId)
      : await orderReader.findById(input.data.orderId);
    if (!order || order.customerId !== session.customerId) {
      return context.json(
        errorResponse("ORDER_NOT_FOUND", "the order was not found", context.get("correlationId")),
        404,
      );
    }
    if (order.status !== "locked") {
      return context.json(
        errorResponse(
          "ORDER_REQUEST_NOT_ELIGIBLE",
          "a canceled order cannot receive a new request",
          context.get("correlationId"),
        ),
        409,
      );
    }
    const requests = await repository.listByCustomer(session.customerId);
    if (
      requests.some(
        (request) =>
          request.orderId === order.id &&
          request.kind === input.data.kind &&
          request.status === "pending",
      )
    ) {
      return context.json(
        errorResponse(
          "ORDER_REQUEST_ALREADY_PENDING",
          `a ${input.data.kind} request is already pending for this order`,
          context.get("correlationId"),
        ),
        409,
      );
    }
    if (input.data.kind === "refund" && order.paymentState !== "paid") {
      return context.json(
        errorResponse(
          "ORDER_NOT_REFUND_ELIGIBLE",
          "only a paid order can have a refund requested",
          context.get("correlationId"),
        ),
        409,
      );
    }
    if (input.data.kind === "cancellation") {
      if (order.paymentState === "paid" || order.paymentState === "pending") {
        return context.json(
          errorResponse(
            "ORDER_NOT_CANCELLATION_ELIGIBLE",
            "paid or payment-pending orders require support or a refund request",
            context.get("correlationId"),
          ),
          409,
        );
      }
      const assignment = dispatchRepository
        ? (await dispatchRepository.list(order.cycleId)).find((item) => item.orderId === order.id)
        : undefined;
      if (assignment) {
        return context.json(
          errorResponse(
            "ORDER_NOT_CANCELLATION_ELIGIBLE",
            "an order already assigned for delivery cannot be canceled",
            context.get("correlationId"),
          ),
          409,
        );
      }
    }
    const timestamp = now().toISOString();
    const request = {
      id: crypto.randomUUID(),
      customerId: session.customerId,
      orderId: order.id,
      kind: input.data.kind,
      reason: input.data.reason,
      status: "pending" as const,
      idempotencyKey,
      requestFingerprint: fingerprint,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await repository.save(request);
    await saveOptionalAudit(options.identityRepository, bindings, {
      actorUserId: session.userId,
      action: `order_request.${request.kind}-requested`,
      targetType: "order_request",
      targetId: request.id,
      occurredAt: timestamp,
      metadata: {
        orderId: request.orderId,
        customerId: request.customerId,
        correlationId: context.get("correlationId"),
      },
    });
    const body = { data: request, meta: { correlationId: context.get("correlationId") } };
    customerOrderRequestResponseSchema.parse(body);
    return context.json(body, 201);
  });

  app.get("/api/v1/admin/order-requests", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const repository =
      options.customerOrderRequestRepository ??
      (bindings.DB ? new D1CustomerOrderRequestRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (
      !session ||
      !(
        hasAdminPermission(session.role, session.adminPermissions, "finance") ||
        hasAdminPermission(session.role, session.adminPermissions, "support") ||
        hasAdminPermission(session.role, session.adminPermissions, "dispatch")
      )
    ) {
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "order request administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    }
    if (!repository) {
      return context.json(
        errorResponse(
          "ORDER_REQUESTS_UNAVAILABLE",
          "order requests are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const requests = (await repository.listPending()).filter((request) =>
      request.kind === "refund"
        ? hasAdminPermission(session.role, session.adminPermissions, "finance")
        : hasAdminPermission(session.role, session.adminPermissions, "support") ||
          hasAdminPermission(session.role, session.adminPermissions, "dispatch"),
    );
    const body = {
      data: { requests },
      meta: { correlationId: context.get("correlationId") },
    };
    adminOrderRequestsResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.post("/api/v1/admin/order-requests/:id/decision", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const repository =
      options.customerOrderRequestRepository ??
      (bindings.DB ? new D1CustomerOrderRequestRepository(bindings.DB) : undefined);
    const orderReader =
      options.orderReader ?? (bindings.DB ? new D1OrderRepository(bindings.DB) : undefined);
    const paymentService =
      options.paymentService ??
      (bindings.DB && options.paymentProvider
        ? new DefaultPaymentService(new D1PaymentRepository(bindings.DB), options.paymentProvider)
        : undefined);
    const session = context.get("session");
    if (!session) {
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active administrator session is required",
          context.get("correlationId"),
        ),
        401,
      );
    }
    if (!repository || !orderReader) {
      return context.json(
        errorResponse(
          "ORDER_REQUESTS_UNAVAILABLE",
          "order requests are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const idempotencyKey = context.req.header("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 128) {
      return context.json(
        errorResponse(
          "MISSING_IDEMPOTENCY_KEY",
          "a valid Idempotency-Key is required",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const request = await repository.findById(context.req.param("id"));
    if (!request) {
      return context.json(
        errorResponse(
          "ORDER_REQUEST_NOT_FOUND",
          "order request was not found",
          context.get("correlationId"),
        ),
        404,
      );
    }
    const permission = request.kind === "refund" ? "finance" : "support";
    const canDecide =
      hasAdminPermission(session.role, session.adminPermissions, permission) ||
      (request.kind === "cancellation" &&
        hasAdminPermission(session.role, session.adminPermissions, "dispatch"));
    if (!canDecide) {
      return context.json(
        errorResponse(
          "FORBIDDEN",
          `${permission} administrator permission is required`,
          context.get("correlationId"),
        ),
        403,
      );
    }
    const input = adminOrderRequestDecisionSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_ORDER_REQUEST_DECISION",
          "order request decision is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const finalDecision = request.status === "completed" ? "approve" : "reject";
    if (request.status === "completed" || request.status === "rejected") {
      if (input.data.decision !== finalDecision) {
        return context.json(
          errorResponse(
            "ORDER_REQUEST_ALREADY_DECIDED",
            "order request already has a different final decision",
            context.get("correlationId"),
          ),
          409,
        );
      }
      const body = { data: request, meta: { correlationId: context.get("correlationId") } };
      customerOrderRequestResponseSchema.parse(body);
      return context.json(body, 200);
    }
    if (request.status === "approved" && input.data.decision === "reject") {
      return context.json(
        errorResponse(
          "ORDER_REQUEST_ALREADY_APPROVED",
          "an approved request must be retried to completion",
          context.get("correlationId"),
        ),
        409,
      );
    }
    const timestamp = now().toISOString();
    if (input.data.decision === "reject") {
      const rejected = decideCustomerOrderRequest(request, "rejected", timestamp);
      await repository.update(rejected);
      await saveOptionalAudit(options.identityRepository, bindings, {
        actorUserId: session.userId,
        action: `order_request.${request.kind}-rejected`,
        targetType: "order_request",
        targetId: request.id,
        occurredAt: timestamp,
        metadata: {
          orderId: request.orderId,
          customerId: request.customerId,
          correlationId: context.get("correlationId"),
        },
      });
      const body = { data: rejected, meta: { correlationId: context.get("correlationId") } };
      customerOrderRequestResponseSchema.parse(body);
      return context.json(body, 200);
    }
    const approved = decideCustomerOrderRequest(request, "approved", timestamp);
    await repository.update(approved);
    try {
      if (request.kind === "cancellation") {
        if (!orderReader.cancel) {
          throw new Error("order cancellation is unavailable");
        }
        await orderReader.cancel(request.orderId);
      } else {
        if (!paymentService) {
          throw new Error("payment refunds are unavailable");
        }
        await paymentService.refundOrder({
          customerId: request.customerId,
          orderId: request.orderId,
          reason: request.reason,
          idempotencyKey: `order-request:${request.id}`,
          now: timestamp,
        });
      }
      const completed = decideCustomerOrderRequest(approved, "completed", now().toISOString());
      await repository.update(completed);
      await saveOptionalAudit(options.identityRepository, bindings, {
        actorUserId: session.userId,
        action: `order_request.${request.kind}-completed`,
        targetType: "order_request",
        targetId: request.id,
        occurredAt: completed.updatedAt,
        metadata: {
          orderId: request.orderId,
          customerId: request.customerId,
          correlationId: context.get("correlationId"),
        },
      });
      const body = { data: completed, meta: { correlationId: context.get("correlationId") } };
      customerOrderRequestResponseSchema.parse(body);
      return context.json(body, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "order request execution failed";
      return context.json(
        errorResponse("ORDER_REQUEST_EXECUTION_FAILED", message, context.get("correlationId")),
        409,
      );
    }
  });

  app.get("/api/v1/order-substitutions", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.customerOrderSubstitutionRepository ??
      (bindings.DB ? new D1CustomerOrderSubstitutionRepository(bindings.DB) : undefined);
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
    if (!repository) {
      return context.json(
        errorResponse(
          "ORDER_SUBSTITUTIONS_UNAVAILABLE",
          "customer substitutions are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const body = {
      data: {
        substitutions: (await repository.listByCustomer(session.customerId)).map(
          toCustomerOrderSubstitutionData,
        ),
      },
      meta: { correlationId: context.get("correlationId") },
    };
    customerOrderSubstitutionsResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.post("/api/v1/order-substitutions/:id/decision", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.customerOrderSubstitutionRepository ??
      (bindings.DB ? new D1CustomerOrderSubstitutionRepository(bindings.DB) : undefined);
    const procurementRepository =
      options.procurementRepository ??
      (bindings.DB ? new D1ProcurementRepository(bindings.DB) : undefined);
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
    if (!repository || !procurementRepository) {
      return context.json(
        errorResponse(
          "ORDER_SUBSTITUTIONS_UNAVAILABLE",
          "customer substitutions are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const idempotencyKey = context.req.header("idempotency-key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 128) {
      return context.json(
        errorResponse(
          "MISSING_IDEMPOTENCY_KEY",
          "a valid Idempotency-Key is required",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const input = customerOrderSubstitutionDecisionSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_SUBSTITUTION_DECISION",
          "substitution decision input is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const fingerprint = JSON.stringify(input.data);
    const existing = await repository.findByIdempotency(session.customerId, idempotencyKey);
    if (existing) {
      if (existing.requestFingerprint !== fingerprint) {
        return context.json(
          errorResponse(
            "IDEMPOTENCY_CONFLICT",
            "idempotency key was already used for a different substitution decision",
            context.get("correlationId"),
          ),
          409,
        );
      }
      const body = {
        data: toCustomerOrderSubstitutionData(existing),
        meta: { correlationId: context.get("correlationId") },
      };
      customerOrderSubstitutionResponseSchema.parse(body);
      return context.json(body, 200);
    }
    const substitution = await repository.findById(session.customerId, context.req.param("id"));
    if (!substitution) {
      return context.json(
        errorResponse(
          "SUBSTITUTION_NOT_FOUND",
          "the substitution was not found",
          context.get("correlationId"),
        ),
        404,
      );
    }
    if (substitution.status !== "pending") {
      return context.json(
        errorResponse(
          "SUBSTITUTION_ALREADY_DECIDED",
          "the substitution already has a decision",
          context.get("correlationId"),
        ),
        409,
      );
    }
    const updatedAt = now().toISOString();
    const updated = createCustomerOrderSubstitution({
      ...substitution,
      status: input.data.decision === "accept" ? "accepted" : "rejected",
      idempotencyKey,
      requestFingerprint: fingerprint,
      decidedAt: updatedAt,
      updatedAt,
    });
    await procurementRepository.saveSubstitution(
      createProcurementSubstitution({
        id: updated.procurementSubstitutionId,
        shortageId: updated.shortageId,
        originalSkuId: updated.originalSkuId,
        substituteSkuId: updated.substituteSkuId,
        quantity: updated.quantity,
        status: input.data.decision === "accept" ? "approved" : "rejected",
        approvedAt: input.data.decision === "accept" ? updatedAt : null,
      }),
    );
    await repository.save(updated);
    await saveOptionalAudit(options.identityRepository, bindings, {
      actorUserId: session.userId,
      action: `customer.substitution.${input.data.decision}ed`,
      targetType: "customer_order_substitution",
      targetId: updated.id,
      occurredAt: updatedAt,
      metadata: { orderId: updated.orderId, substituteSkuId: updated.substituteSkuId },
    });
    const body = {
      data: toCustomerOrderSubstitutionData(updated),
      meta: { correlationId: context.get("correlationId") },
    };
    customerOrderSubstitutionResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.post("/api/v1/deliveryman/media", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.deliveryMediaRepository ??
      (bindings.DB ? new D1DeliveryMediaRepository(bindings.DB) : undefined);
    const assignmentRepository =
      options.deliveryEventRepository ??
      (bindings.DB ? new D1DeliveryEventRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || session.role !== "deliveryman")
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "an active deliveryman session is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository || !assignmentRepository)
      return context.json(
        errorResponse(
          "MEDIA_UNAVAILABLE",
          "delivery media is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const input = deliveryMediaUploadRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_DELIVERY_MEDIA",
          "delivery media is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const cycle = assignWeeklyCycle(now());
    const assignment = (await assignmentRepository.listAssignments(session.userId, cycle.id)).find(
      (item) => item.id === input.data.assignmentId && item.orderId === input.data.orderId,
    );
    if (!assignment)
      return context.json(
        errorResponse(
          "DELIVERY_MEDIA_FORBIDDEN",
          "media assignment is not owned by this deliveryman",
          context.get("correlationId"),
        ),
        403,
      );
    const existing = await repository.findByClientId(input.data.clientMediaId);
    if (existing && !isSameDeliveryMediaRequest(existing, input.data, session.userId))
      return context.json(
        errorResponse(
          "MEDIA_IDEMPOTENCY_CONFLICT",
          "client media id was already used for a different upload",
          context.get("correlationId"),
        ),
        409,
      );
    const mediaId = crypto.randomUUID();
    const requestedRecord: DeliveryMediaRecord = {
      id: mediaId,
      clientMediaId: input.data.clientMediaId,
      orderId: input.data.orderId,
      assignmentId: input.data.assignmentId,
      uploadedByUserId: session.userId,
      kind: input.data.kind,
      objectKey: `orders/${input.data.orderId}/delivery/${mediaId}`,
      contentType: input.data.contentType,
      sizeBytes: input.data.sizeBytes,
      createdAt: now().toISOString(),
    };
    const saved = existing ?? (await repository.save(requestedRecord));
    if (!isSameDeliveryMediaRequest(saved, input.data, session.userId))
      return context.json(
        errorResponse(
          "MEDIA_IDEMPOTENCY_CONFLICT",
          "client media id was already used for a different upload",
          context.get("correlationId"),
        ),
        409,
      );
    const expiresAt = new Date(now().getTime() + 15 * 60_000).toISOString();
    const signer = options.mediaSigner ?? new DeterministicMediaSigner(bindings.MEDIA_BASE_URL);
    const signed = await signer.createUploadUrl({
      objectKey: saved.objectKey,
      contentType: saved.contentType,
      expiresAt,
    });
    const body = {
      data: { id: saved.id, uploadUrl: signed.uploadUrl, uploadUrlExpiresAt: expiresAt },
      meta: { correlationId: context.get("correlationId") },
    };
    deliveryMediaUploadResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.put("/api/v1/media/upload", async (context) => {
    const bindings = context.env ?? {};
    const signedRequest = readSignedMediaRequest(context, true);
    if (
      !bindings.MEDIA_BUCKET ||
      !bindings.MEDIA_SIGNING_SECRET ||
      !signedRequest ||
      !(await verifyMediaRequest(bindings.MEDIA_SIGNING_SECRET, signedRequest))
    ) {
      return context.json(
        errorResponse(
          "MEDIA_UPLOAD_UNAUTHORIZED",
          "the media upload URL is invalid or expired",
          context.get("correlationId"),
        ),
        403,
      );
    }
    const contentType = context.req.header("content-type")?.split(";", 1)[0]?.trim();
    const signedContentType = signedRequest.contentType;
    if (!signedContentType || contentType !== signedContentType) {
      return context.json(
        errorResponse(
          "MEDIA_CONTENT_TYPE_MISMATCH",
          "the uploaded media type does not match the signed request",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const body = await context.req.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > 10 * 1024 * 1024) {
      return context.json(
        errorResponse(
          "MEDIA_SIZE_INVALID",
          "delivery media must be between 1 byte and 10 MB",
          context.get("correlationId"),
        ),
        400,
      );
    }
    await bindings.MEDIA_BUCKET.put(signedRequest.objectKey, body, {
      httpMetadata: { contentType: signedContentType },
    });
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  });

  app.get("/api/v1/media/download", async (context) => {
    const bindings = context.env ?? {};
    const signedRequest = readSignedMediaRequest(context, false);
    if (
      !bindings.MEDIA_BUCKET ||
      !bindings.MEDIA_SIGNING_SECRET ||
      !signedRequest ||
      !(await verifyMediaRequest(bindings.MEDIA_SIGNING_SECRET, signedRequest))
    ) {
      return context.json(
        errorResponse(
          "MEDIA_DOWNLOAD_UNAUTHORIZED",
          "the media download URL is invalid or expired",
          context.get("correlationId"),
        ),
        403,
      );
    }
    const object = await bindings.MEDIA_BUCKET.get(signedRequest.objectKey);
    if (!object) {
      return context.json(
        errorResponse(
          "MEDIA_NOT_FOUND",
          "delivery media was not found",
          context.get("correlationId"),
        ),
        404,
      );
    }
    const headers = new Headers({ "cache-control": "private, no-store" });
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    return new Response(object.body, { headers });
  });

  app.get("/api/v1/orders/:id/media", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.deliveryMediaRepository ??
      (bindings.DB ? new D1DeliveryMediaRepository(bindings.DB) : undefined);
    const trackingRepository =
      options.deliveryTrackingRepository ??
      (bindings.DB ? new D1DeliveryTrackingRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || session.role !== "customer" || !session.customerId)
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository || !trackingRepository)
      return context.json(
        errorResponse(
          "MEDIA_UNAVAILABLE",
          "delivery media is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const orderId = context.req.param("id");
    if (!(await trackingRepository.get(orderId, session.customerId)))
      return context.json(
        errorResponse("ORDER_NOT_FOUND", "order was not found", context.get("correlationId")),
        404,
      );
    const signer = options.mediaSigner ?? new DeterministicMediaSigner(bindings.MEDIA_BASE_URL);
    const expiresAt = new Date(now().getTime() + 15 * 60_000).toISOString();
    const media = await repository.listForCustomer(orderId, session.customerId);
    const body = {
      data: {
        media: await Promise.all(
          media.map(async (item) => ({
            id: item.id,
            orderId: item.orderId,
            assignmentId: item.assignmentId,
            kind: item.kind,
            contentType: item.contentType,
            sizeBytes: item.sizeBytes,
            createdAt: item.createdAt,
            downloadUrl: (await signer.createDownloadUrl({ objectKey: item.objectKey, expiresAt }))
              .downloadUrl,
            downloadUrlExpiresAt: expiresAt,
          })),
        ),
      },
      meta: { correlationId: context.get("correlationId") },
    };
    deliveryMediaListResponseSchema.parse(body);
    return context.json(body, 200);
  });

  async function quoteSavedCart(context: ApiContext, promotionCode?: string) {
    const bindings: ApiBindings = context.env ?? {};
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
    const subscriptionReader =
      options.subscriptionReader ??
      (bindings.DB ? new D1SubscriptionRepository(bindings.DB) : undefined);
    const planLookup =
      options.planLookup ??
      (bindings.DB ? new D1PlanReader(bindings.DB) : createDefaultPlanReader());
    const cartRepository =
      options.cartRepository ??
      (bindings.DB ? new D1CartRepository(bindings.DB) : fallbackCartRepository);
    const catalogReader =
      options.catalogCheckoutReader ??
      (bindings.DB ? new D1CatalogReader(bindings.DB) : createDefaultCatalogReader());
    const promotionRepository =
      options.promotionRepository ??
      (bindings.DB ? new D1PromotionRepository(bindings.DB) : undefined);
    if (!subscriptionReader || !planLookup) {
      return context.json(
        errorResponse(
          "CHECKOUT_UNAVAILABLE",
          "checkout is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    const subscription = await subscriptionReader.findByCustomerId(session.customerId);
    if (
      !subscription ||
      subscription.status !== "active" ||
      subscription.billingStatus !== "current"
    ) {
      return context.json(
        errorResponse(
          "SUBSCRIPTION_NOT_ELIGIBLE",
          "an active subscription is required to calculate checkout",
          context.get("correlationId"),
        ),
        409,
      );
    }
    const plan = await planLookup.findActiveById(subscription.planId);
    const savedCart = await cartRepository.findByCustomerId(session.customerId);
    if (!plan || !savedCart?.lines.length) {
      return context.json(
        errorResponse(
          plan ? "CART_EMPTY" : "PLAN_NOT_FOUND",
          plan
            ? "the cart must contain at least one available SKU"
            : "the subscription plan is unavailable",
          context.get("correlationId"),
        ),
        409,
      );
    }
    const catalogItems = await catalogReader.findActiveByIds(
      savedCart.lines.map((line) => line.skuId),
    );
    if (catalogItems.length !== savedCart.lines.length) {
      return context.json(
        errorResponse(
          "SKU_NOT_AVAILABLE",
          "one or more SKUs are unavailable",
          context.get("correlationId"),
        ),
        409,
      );
    }
    const catalogById = new Map(catalogItems.map((item) => [item.id, item]));
    const deliveryFeeCentavos = resolveDeliveryFeeCentavos(options.deliveryFeeCentavos, bindings);
    if (deliveryFeeCentavos === null) {
      return context.json(
        errorResponse(
          "CHECKOUT_CONFIGURATION_INVALID",
          "delivery fee configuration is invalid",
          context.get("correlationId"),
        ),
        503,
      );
    }
    try {
      const quote = await new CheckoutPricingService(promotionRepository).quote({
        customerId: session.customerId,
        ...(promotionCode ? { code: promotionCode } : {}),
        cart: {
          lines: savedCart.lines.map((line) => {
            const item = catalogById.get(line.skuId);
            if (!item) throw new Error("SKU_NOT_AVAILABLE");
            return { skuId: item.id, quantity: line.quantity, unitPrice: item.price };
          }),
        },
        plan,
        deliveryFee: createMoney(deliveryFeeCentavos),
        now: now().toISOString(),
        categoryIds: new Map(catalogItems.map((item) => [item.id, item.categoryId])),
      });
      const body = checkoutQuoteBody(quote, context.get("correlationId"));
      checkoutQuoteResponseSchema.parse(body);
      return context.json(body, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "promotion could not be applied";
      return context.json(
        errorResponse(promotionErrorCode(message), message, context.get("correlationId")),
        409,
      );
    }
  }

  app.post("/api/v1/checkout/coupon", async (context) => {
    const input = couponRequestSchema.safeParse(await context.req.json().catch(() => ({})));
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_PROMOTION_CODE",
          "promotion code is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    return quoteSavedCart(context, input.data.code);
  });

  app.delete("/api/v1/checkout/coupon", (context) => quoteSavedCart(context));

  app.get("/api/v1/admin/promotions", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.promotionRepository ??
      (bindings.DB ? new D1PromotionRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "marketing"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "marketing administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository?.list)
      return context.json(
        errorResponse(
          "PROMOTION_UNAVAILABLE",
          "promotion administration is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const body = {
      data: { promotions: await repository.list() },
      meta: { correlationId: context.get("correlationId") },
    };
    promotionAdminListResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.post("/api/v1/admin/promotions", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.promotionRepository ??
      (bindings.DB ? new D1PromotionRepository(bindings.DB) : undefined);
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "marketing"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "marketing administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository?.savePromotion)
      return context.json(
        errorResponse(
          "PROMOTION_UNAVAILABLE",
          "promotion administration is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const input = promotionAdminUpsertRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_PROMOTION",
          "promotion campaign input is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const promotion: Promotion = {
      id: crypto.randomUUID(),
      code: normalizePromotionCode(input.data.code),
      version: 1,
      status: "draft",
      startsAt: input.data.startsAt,
      endsAt: input.data.endsAt,
      discount: input.data.discount,
      minimumSubtotal: input.data.minimumSubtotal,
      planIds: input.data.planIds,
      skuIds: input.data.skuIds,
      categoryIds: input.data.categoryIds,
      firstOrderOnly: input.data.firstOrderOnly,
      firstWeekOnly: input.data.firstWeekOnly,
      totalBudget: input.data.totalBudget,
      totalRedemptions: input.data.totalRedemptions,
      perCustomerRedemptions: input.data.perCustomerRedemptions,
      redeemedAmount: createMoney(0),
      redemptionCount: 0,
      allowsStacking: input.data.allowsStacking,
    };
    await repository.savePromotion(promotion);
    const body = { data: promotion, meta: { correlationId: context.get("correlationId") } };
    promotionAdminResponseSchema.parse(body);
    return context.json(body, 201);
  });

  app.patch("/api/v1/admin/promotions/:id/status", async (context) => {
    const bindings = context.env ?? {};
    const repository =
      options.promotionRepository ??
      (bindings.DB ? new D1PromotionRepository(bindings.DB) : undefined);
    const session = context.get("session");
    const requested = promotionStatusRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!requested.success)
      return context.json(
        errorResponse(
          "INVALID_PROMOTION_STATUS",
          "promotion status is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const permission = requested.data.status === "active" ? "finance" : "marketing";
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, permission))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          `${permission} administrator permission is required`,
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    if (!repository?.updatePromotionStatus)
      return context.json(
        errorResponse(
          "PROMOTION_UNAVAILABLE",
          "promotion administration is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    await repository.updatePromotionStatus(
      context.req.param("id"),
      requested.data.status,
      now().toISOString(),
    );
    const body = {
      data: { id: context.req.param("id"), status: requested.data.status },
      meta: { correlationId: context.get("correlationId") },
    };
    promotionAdminResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.get("/api/v1/admin/promotion-banners", async (context) => {
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "marketing"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "marketing administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    const repository =
      options.promotionBannerRepository ??
      (context.env?.DB ? new D1PromotionBannerRepository(context.env.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "PROMOTION_BANNERS_UNAVAILABLE",
          "promotion banners are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const body = {
      data: { banners: await repository.list() },
      meta: { correlationId: context.get("correlationId") },
    };
    promotionBannerAdminListResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.post("/api/v1/admin/promotion-media/uploads", async (context) => {
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "marketing"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "marketing administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    const input = promotionMediaUploadRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_PROMOTION_MEDIA",
          "promotion media input is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const extension =
      input.data.contentType === "image/jpeg"
        ? "jpg"
        : input.data.contentType === "image/png"
          ? "png"
          : "webp";
    const objectKey = `promotions/${input.data.bannerId}/${input.data.variant}/${crypto.randomUUID()}.${extension}`;
    const expiresAt = new Date(now().getTime() + 5 * 60_000).toISOString();
    const signer =
      options.promotionMediaSigner ??
      new DeterministicPromotionMediaSigner(context.env?.PROMOTION_MEDIA_BASE_URL);
    const signed = await signer.createUploadUrl({
      objectKey,
      contentType: input.data.contentType,
      sizeBytes: input.data.sizeBytes,
      expiresAt,
    });
    const body = {
      data: { objectKey, uploadUrl: signed.uploadUrl, expiresAt },
      meta: { correlationId: context.get("correlationId") },
    };
    promotionMediaUploadResponseSchema.parse(body);
    return context.json(body, 201);
  });

  app.post("/api/v1/admin/promotion-banners", async (context) => {
    const session = context.get("session");
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, "marketing"))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          "marketing administrator permission is required",
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    const repository =
      options.promotionBannerRepository ??
      (context.env?.DB ? new D1PromotionBannerRepository(context.env.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "PROMOTION_BANNERS_UNAVAILABLE",
          "promotion banners are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const input = promotionBannerUpsertRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_PROMOTION_BANNER",
          "promotion banner input is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const createdAt = now().toISOString();
    const banner = {
      id: crypto.randomUUID(),
      ...input.data,
      status: "draft" as const,
      cacheVersion: 1,
      createdByUserId: session.userId,
      createdAt,
      updatedAt: createdAt,
    };
    await repository.save(banner);
    const body = { data: banner, meta: { correlationId: context.get("correlationId") } };
    promotionBannerResponseSchema.parse(body);
    return context.json(body, 201);
  });

  app.patch("/api/v1/admin/promotion-banners/:id/status", async (context) => {
    const requested = promotionBannerStatusRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!requested.success)
      return context.json(
        errorResponse(
          "INVALID_PROMOTION_BANNER_STATUS",
          "promotion banner status is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const session = context.get("session");
    const permission = requested.data.status === "active" ? "finance" : "marketing";
    if (!session || !hasAdminPermission(session.role, session.adminPermissions, permission))
      return context.json(
        errorResponse(
          "FORBIDDEN",
          `${permission} administrator permission is required`,
          context.get("correlationId"),
        ),
        session ? 403 : 401,
      );
    const repository =
      options.promotionBannerRepository ??
      (context.env?.DB ? new D1PromotionBannerRepository(context.env.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "PROMOTION_BANNERS_UNAVAILABLE",
          "promotion banners are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    await repository.updateStatus(
      context.req.param("id"),
      requested.data.status,
      now().toISOString(),
    );
    const banner = (await repository.list()).find(
      (candidate) => candidate.id === context.req.param("id"),
    );
    if (!banner)
      return context.json(
        errorResponse(
          "PROMOTION_BANNER_NOT_FOUND",
          "promotion banner was not found",
          context.get("correlationId"),
        ),
        404,
      );
    const body = { data: banner, meta: { correlationId: context.get("correlationId") } };
    promotionBannerResponseSchema.parse(body);
    return context.json(body, 200);
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
    const deliveryAddressRepository =
      options.deliveryAddressRepository ??
      (bindings.DB ? new D1DeliveryAddressRepository(bindings.DB) : undefined);
    const deliveryWindowRepository =
      options.deliveryWindowRepository ??
      (bindings.DB ? new D1DeliveryWindowRepository(bindings.DB) : undefined);
    const promotionRepository =
      options.promotionRepository ??
      (bindings.DB ? new D1PromotionRepository(bindings.DB) : undefined);

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
    const checkoutTime = now();
    const cutoff = evaluateOrderCutoff(checkoutTime);
    if (!cutoff.allowed) {
      return context.json(
        errorResponse(
          "ORDER_CUTOFF_PASSED",
          `orders for ${cutoff.cycleId} closed at ${cutoff.cutoffAt}`,
          context.get("correlationId"),
        ),
        409,
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
    if (
      !subscription ||
      subscription.status !== "active" ||
      subscription.billingStatus !== "current"
    ) {
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
    const deliveryAddress = deliveryAddressRepository
      ? await deliveryAddressRepository.findByCustomerId(session.customerId)
      : null;
    if (deliveryAddressRepository) {
      if (
        !deliveryAddress ||
        !resolveServiceability(deliveryAddress.postalCode, options, bindings)
      ) {
        return context.json(
          errorResponse(
            "DELIVERY_ADDRESS_REQUIRED",
            "a serviceable delivery address is required to place an order",
            context.get("correlationId"),
          ),
          409,
        );
      }
    }
    const deliveryWindowSelection = deliveryWindowRepository
      ? await deliveryWindowRepository.findSelection(session.customerId, cutoff.cycleId)
      : null;
    const deliveryWindow = deliveryWindowSelection
      ? ((await deliveryWindowRepository!.listForCycle(cutoff.cycleId)).find(
          (window) => window.id === deliveryWindowSelection.windowId,
        ) ?? null)
      : null;
    if (deliveryWindowRepository && !deliveryWindow) {
      return context.json(
        errorResponse(
          "DELIVERY_WINDOW_REQUIRED",
          "an active delivery window is required to place an order",
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
      const quote = await new CheckoutPricingService(promotionRepository).quote({
        customerId: session.customerId,
        ...(input.data.promotionCode ? { code: input.data.promotionCode } : {}),
        cart: { lines: cartLines },
        plan,
        deliveryFee: createMoney(deliveryFeeCentavos),
        now: checkoutTime.toISOString(),
        categoryIds: new Map(catalogItems.map((item) => [item.id, item.categoryId])),
      });
      const order = await orderLockService.lock({
        customerId: session.customerId,
        subscriptionId: subscription.id,
        cycleId: cutoff.cycleId,
        idempotencyKey,
        cart: { lines: cartLines },
        plan,
        deliveryFee: quote.promotion?.deliveryFee ?? createMoney(deliveryFeeCentavos),
        ...(quote.promotion ? { promotion: quote.promotion } : {}),
        deliveryAddress,
        deliveryWindow,
        paymentState: "unpaid",
        lockedAt: checkoutTime.toISOString(),
      });
      if (!input.data.lines) {
        await cartRepository.clear(session.customerId);
      }
      const body = {
        data: {
          id: order.id,
          subscriptionId: order.subscriptionId,
          planId: order.planId,
          cycleId: order.cycleId,
          lines: order.cart.lines,
          weeklyCredit: order.weeklyCredit,
          totals: order.totals,
          appliedPromotion: order.appliedPromotion ?? null,
          deliveryAddress: order.deliveryAddress
            ? {
                recipientName: order.deliveryAddress.recipientName,
                phone: order.deliveryAddress.phone,
                line1: order.deliveryAddress.line1,
                line2: order.deliveryAddress.line2,
                barangay: order.deliveryAddress.barangay,
                city: order.deliveryAddress.city,
                province: order.deliveryAddress.province,
                postalCode: order.deliveryAddress.postalCode,
                instructions: order.deliveryAddress.instructions,
              }
            : null,
          deliveryWindow: order.deliveryWindow
            ? {
                id: order.deliveryWindow.id,
                cycleId: order.deliveryWindow.cycleId,
                label: order.deliveryWindow.label,
                startsAt: order.deliveryWindow.startsAt,
                endsAt: order.deliveryWindow.endsAt,
              }
            : null,
          paymentState: order.paymentState ?? "unpaid",
          status: order.status,
          lockedAt: order.lockedAt,
        },
        meta: { correlationId: context.get("correlationId") },
      };
      orderResponseSchema.parse(body);
      return context.json(body, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "order creation failed";
      const code =
        message.includes("promotion") ||
        message.includes("subtotal") ||
        message.includes("redemption")
          ? promotionErrorCode(message)
          : message.includes("idempotency")
            ? "IDEMPOTENCY_KEY_REUSED"
            : message.includes("SKU")
              ? "SKU_NOT_AVAILABLE"
              : "INVALID_ORDER_REQUEST";
      return context.json(errorResponse(code, message, context.get("correlationId")), 409);
    }
  });

  app.post("/api/v1/payments/charge", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const paymentService =
      options.paymentService ??
      (bindings.DB && options.paymentProvider
        ? new DefaultPaymentService(new D1PaymentRepository(bindings.DB), options.paymentProvider)
        : undefined);
    const orderReader =
      options.orderReader ?? (bindings.DB ? new D1OrderRepository(bindings.DB) : undefined);
    if (!paymentService || !orderReader) {
      return context.json(
        errorResponse(
          "PAYMENT_UNAVAILABLE",
          "payment charging is unavailable",
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
    const input = paymentChargeRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_PAYMENT_REQUEST",
          "payment request is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    const order = await orderReader.findById(input.data.orderId);
    if (!order || order.customerId !== session.customerId) {
      return context.json(
        errorResponse("ORDER_NOT_FOUND", "the order was not found", context.get("correlationId")),
        404,
      );
    }
    try {
      const attempt = await paymentService.charge({
        customerId: session.customerId,
        orderId: order.id,
        customerReference: input.data.customerReference,
        paymentMethodReference: input.data.paymentMethodReference,
        amount: order.totals.totalDue,
        idempotencyKey,
        now: now().toISOString(),
      });
      if (orderReader.updatePaymentState) {
        await orderReader.updatePaymentState(
          order.id,
          attempt.status === "succeeded" ? "paid" : attempt.status,
        );
      }
      const body = paymentAttemptResponse(attempt, context.get("correlationId"));
      paymentAttemptResponseSchema.parse(body);
      return context.json(body, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "payment charge failed";
      const code = error instanceof PaymentProviderError ? error.code : "PAYMENT_CHARGE_FAILED";
      return context.json(errorResponse(code, message, context.get("correlationId")), 409);
    }
  });

  app.get("/api/v1/payments/methods", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const paymentService =
      options.paymentService ??
      (bindings.DB && options.paymentProvider
        ? new DefaultPaymentService(new D1PaymentRepository(bindings.DB), options.paymentProvider)
        : undefined);
    if (!paymentService) {
      return context.json(
        errorResponse(
          "PAYMENT_UNAVAILABLE",
          "payment methods are unavailable",
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
    const methods = await paymentService.listPaymentMethods(session.customerId);
    const body = {
      data: {
        methods: methods.map((method) => ({
          id: method.id,
          providerReference: method.providerReference,
          type: method.type,
          status: method.status,
          createdAt: method.createdAt,
          updatedAt: method.updatedAt,
        })),
      },
      meta: { correlationId: context.get("correlationId") },
    };
    paymentMethodListResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.get("/api/v1/payments/history", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const paymentService =
      options.paymentService ??
      (bindings.DB && options.paymentProvider
        ? new DefaultPaymentService(new D1PaymentRepository(bindings.DB), options.paymentProvider)
        : undefined);
    if (!paymentService)
      return context.json(
        errorResponse(
          "PAYMENT_UNAVAILABLE",
          "payment history is unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const session = context.get("session");
    if (!session || session.role !== "customer" || !session.customerId)
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "an active customer session is required",
          context.get("correlationId"),
        ),
        401,
      );
    const entries = await paymentService.listPaymentHistory(session.customerId);
    const body = {
      data: {
        entries: entries.map((entry) => ({
          id: entry.id,
          kind: entry.kind,
          orderId: entry.orderId,
          paymentAttemptId: entry.paymentAttemptId,
          amount: entry.amount,
          status: entry.status,
          occurredAt: entry.occurredAt,
        })),
      },
      meta: { correlationId: context.get("correlationId") },
    };
    paymentHistoryResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.post("/api/v1/payments/methods", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const paymentService =
      options.paymentService ??
      (bindings.DB && options.paymentProvider
        ? new DefaultPaymentService(new D1PaymentRepository(bindings.DB), options.paymentProvider)
        : undefined);
    if (!paymentService) {
      return context.json(
        errorResponse(
          "PAYMENT_UNAVAILABLE",
          "payment methods are unavailable",
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
    const input = paymentMethodRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_PAYMENT_METHOD_REQUEST",
          "payment method request is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    try {
      const method = await paymentService.addPaymentMethod({
        customerId: session.customerId,
        customerReference: input.data.customerReference,
        type: input.data.type,
        token: input.data.token,
        idempotencyKey,
        now: now().toISOString(),
      });
      const body = {
        data: {
          id: method.id,
          providerReference: method.providerReference,
          type: method.type,
          status: method.status,
          createdAt: method.createdAt,
          updatedAt: method.updatedAt,
        },
        meta: { correlationId: context.get("correlationId") },
      };
      paymentMethodResponseSchema.parse(body);
      return context.json(body, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "payment method creation failed";
      const code = error instanceof PaymentProviderError ? error.code : "PAYMENT_METHOD_FAILED";
      return context.json(errorResponse(code, message, context.get("correlationId")), 409);
    }
  });

  app.delete("/api/v1/payments/methods/:id", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const paymentService =
      options.paymentService ??
      (bindings.DB && options.paymentProvider
        ? new DefaultPaymentService(new D1PaymentRepository(bindings.DB), options.paymentProvider)
        : undefined);
    if (!paymentService) {
      return context.json(
        errorResponse(
          "PAYMENT_UNAVAILABLE",
          "payment methods are unavailable",
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
    const input = paymentMethodRevocationRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_PAYMENT_METHOD_REVOCATION_REQUEST",
          "payment method revocation request is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    try {
      const method = await paymentService.revokePaymentMethod({
        customerId: session.customerId,
        customerReference: input.data.customerReference,
        paymentMethodId: context.req.param("id"),
        idempotencyKey,
        now: now().toISOString(),
      });
      const body = {
        data: {
          id: method.id,
          providerReference: method.providerReference,
          type: method.type,
          status: method.status,
          createdAt: method.createdAt,
          updatedAt: method.updatedAt,
        },
        meta: { correlationId: context.get("correlationId") },
      };
      paymentMethodResponseSchema.parse(body);
      return context.json(body, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "payment method revocation failed";
      const code =
        error instanceof PaymentProviderError ? error.code : "PAYMENT_METHOD_REVOCATION_FAILED";
      return context.json(errorResponse(code, message, context.get("correlationId")), 409);
    }
  });

  app.post("/api/v1/payments/webhooks/:provider", async (context) => {
    const paymentService = options.paymentService;
    const paymentProvider = options.paymentProvider;
    if (!paymentService || !paymentProvider) {
      return context.json(
        errorResponse(
          "PAYMENT_UNAVAILABLE",
          "payment webhooks are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    }
    if (context.req.param("provider") !== paymentProvider.name) {
      return context.json(
        errorResponse(
          "UNKNOWN_PAYMENT_PROVIDER",
          "payment provider is not configured",
          context.get("correlationId"),
        ),
        404,
      );
    }
    const signature =
      context.req.header("x-payment-signature") ?? context.req.header("x-signature") ?? "";
    const rawBody = await context.req.text();
    try {
      const event = await paymentProvider.verifyWebhook({ rawBody, signature });
      const result = await paymentService.handleWebhook({
        providerName: paymentProvider.name,
        event,
        receivedAt: now().toISOString(),
      });
      const body = { data: result, meta: { correlationId: context.get("correlationId") } };
      paymentWebhookResponseSchema.parse(body);
      return context.json(body, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "payment webhook failed";
      const code = error instanceof PaymentProviderError ? error.code : "PAYMENT_WEBHOOK_FAILED";
      return context.json(errorResponse(code, message, context.get("correlationId")), 400);
    }
  });

  app.post("/api/v1/admin/payments/refunds", async (context) => {
    const bindings: ApiBindings = context.env ?? {};
    const paymentService =
      options.paymentService ??
      (bindings.DB && options.paymentProvider
        ? new DefaultPaymentService(new D1PaymentRepository(bindings.DB), options.paymentProvider)
        : undefined);
    if (!paymentService) {
      return context.json(
        errorResponse(
          "PAYMENT_UNAVAILABLE",
          "payment refunds are unavailable",
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
    const input = paymentRefundRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!input.success) {
      return context.json(
        errorResponse(
          "INVALID_PAYMENT_REFUND_REQUEST",
          "payment refund request is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    }
    try {
      const refund = await paymentService.refund({
        customerId: input.data.customerId,
        paymentAttemptId: input.data.paymentAttemptId,
        amount: createMoney(input.data.amount.centavos),
        reason: input.data.reason,
        idempotencyKey,
        now: now().toISOString(),
      });
      await saveOptionalAudit(options.identityRepository, bindings, {
        actorUserId: session.userId,
        action: "payment.refunded",
        targetType: "refund",
        targetId: refund.id,
        occurredAt: refund.updatedAt,
        metadata: {
          paymentAttemptId: refund.paymentAttemptId,
          customerId: refund.customerId,
          amountCentavos: String(refund.amount.centavos),
          reason: refund.reason,
          correlationId: context.get("correlationId"),
        },
      });
      const body = {
        data: {
          id: refund.id,
          customerId: refund.customerId,
          paymentAttemptId: refund.paymentAttemptId,
          amount: refund.amount,
          status: refund.status,
          providerReference: refund.providerReference,
          reason: refund.reason,
          createdAt: refund.createdAt,
          updatedAt: refund.updatedAt,
        },
        meta: { correlationId: context.get("correlationId") },
      };
      paymentRefundResponseSchema.parse(body);
      return context.json(body, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : "payment refund failed";
      const code = error instanceof PaymentProviderError ? error.code : "PAYMENT_REFUND_FAILED";
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

  app.get("/api/v1/account/export", async (context) => {
    const session = context.get("session");
    if (!session)
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "authentication is required",
          context.get("correlationId"),
        ),
        401,
      );
    const bindings = context.env ?? {};
    const repository =
      options.identityRepository ??
      (bindings.DB ? new D1IdentityRepository(bindings.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "IDENTITY_UNAVAILABLE",
          "identity operations are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const profile = await repository.findUser(session.userId);
    if (!profile)
      return context.json(
        errorResponse("ACCOUNT_NOT_FOUND", "account was not found", context.get("correlationId")),
        404,
      );
    const sessions = await repository.listSessions(session.userId);
    const body = {
      data: {
        profile: toAccountProfile(profile),
        consents: await repository.listConsents(session.userId),
        sessions: sessions.map((item) => ({ ...item, current: item.id === session.id })),
      },
      meta: { correlationId: context.get("correlationId") },
    };
    accountExportResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.put("/api/v1/account/profile", async (context) => {
    const session = context.get("session");
    if (!session)
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "authentication is required",
          context.get("correlationId"),
        ),
        401,
      );
    const input = accountProfileUpdateRequestSchema.safeParse(
      await context.req.json().catch(() => null),
    );
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_ACCOUNT_PROFILE",
          "account profile is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const bindings = context.env ?? {};
    const repository =
      options.identityRepository ??
      (bindings.DB ? new D1IdentityRepository(bindings.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "IDENTITY_UNAVAILABLE",
          "identity operations are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const idempotencyKey =
      context.req.header("idempotency-key")?.trim() || `profile:${input.data.name}`;
    const profileFingerprint = JSON.stringify(input.data);
    const previous = await repository.findCommandResult(session.userId, "profile", idempotencyKey);
    if (previous) {
      if (previous.requestFingerprint !== profileFingerprint)
        return context.json(
          errorResponse(
            "IDEMPOTENCY_CONFLICT",
            "idempotency key was reused with different account data",
            context.get("correlationId"),
          ),
          409,
        );
      return context.json(
        { data: previous.result, meta: { correlationId: context.get("correlationId") } },
        previous.responseStatus as 200,
      );
    }
    const updatedAt = now().toISOString();
    await repository.updateUserName(session.userId, input.data.name, updatedAt);
    await repository.saveAuditEvent({
      id: await stableIdentityRecordId("profile", session.userId, input.data.name),
      actorUserId: session.userId,
      action: "identity.profile-corrected",
      targetType: "user",
      targetId: session.userId,
      occurredAt: updatedAt,
      metadata: { field: "name" },
    });
    await repository.saveCommandResult({
      userId: session.userId,
      command: "profile",
      idempotencyKey,
      requestFingerprint: profileFingerprint,
      responseStatus: 200,
      result: { name: input.data.name },
      createdAt: updatedAt,
    });
    return context.json(
      { data: { name: input.data.name }, meta: { correlationId: context.get("correlationId") } },
      200,
    );
  });

  app.post("/api/v1/account/consents", async (context) => {
    const session = context.get("session");
    if (!session)
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "authentication is required",
          context.get("correlationId"),
        ),
        401,
      );
    const input = accountConsentRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!input.success)
      return context.json(
        errorResponse("INVALID_CONSENT", "consent is invalid", context.get("correlationId")),
        400,
      );
    const bindings = context.env ?? {};
    const repository =
      options.identityRepository ??
      (bindings.DB ? new D1IdentityRepository(bindings.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "IDENTITY_UNAVAILABLE",
          "identity operations are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const idempotencyKey =
      context.req.header("idempotency-key")?.trim() ||
      `consent:${input.data.purpose}:${input.data.policyVersion}:${input.data.granted}`;
    const consentFingerprint = JSON.stringify(input.data);
    const previous = await repository.findCommandResult(session.userId, "consent", idempotencyKey);
    if (previous) {
      if (previous.requestFingerprint !== consentFingerprint)
        return context.json(
          errorResponse(
            "IDEMPOTENCY_CONFLICT",
            "idempotency key was reused with different consent data",
            context.get("correlationId"),
          ),
          409,
        );
      return context.json(
        { data: previous.result, meta: { correlationId: context.get("correlationId") } },
        previous.responseStatus as 201,
      );
    }
    const recordedAt = now().toISOString();
    const consentId = await stableIdentityRecordId(
      "consent",
      session.userId,
      input.data.purpose,
      input.data.policyVersion,
      String(input.data.granted),
    );
    await repository.saveConsent({
      id: consentId,
      userId: session.userId,
      ...input.data,
      recordedAt,
    });
    await repository.saveAuditEvent({
      id: `audit-${consentId}`,
      actorUserId: session.userId,
      action: "identity.consent-recorded",
      targetType: "consent",
      targetId: consentId,
      occurredAt: recordedAt,
      metadata: { purpose: input.data.purpose, granted: String(input.data.granted) },
    });
    await repository.saveCommandResult({
      userId: session.userId,
      command: "consent",
      idempotencyKey,
      requestFingerprint: consentFingerprint,
      responseStatus: 201,
      result: input.data,
      createdAt: recordedAt,
    });
    return context.json(
      { data: input.data, meta: { correlationId: context.get("correlationId") } },
      201,
    );
  });

  app.post("/api/v1/account/sessions/revoke", async (context) => {
    const session = context.get("session");
    if (!session)
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "authentication is required",
          context.get("correlationId"),
        ),
        401,
      );
    const input = sessionRevokeRequestSchema.safeParse(await context.req.json().catch(() => null));
    if (!input.success)
      return context.json(
        errorResponse(
          "INVALID_SESSION",
          "session revocation is invalid",
          context.get("correlationId"),
        ),
        400,
      );
    const bindings = context.env ?? {};
    const repository =
      options.identityRepository ??
      (bindings.DB ? new D1IdentityRepository(bindings.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "IDENTITY_UNAVAILABLE",
          "identity operations are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const sessions = await repository.listSessions(session.userId);
    if (!sessions.some((item) => item.id === input.data.sessionId))
      return context.json(
        errorResponse("SESSION_NOT_FOUND", "session was not found", context.get("correlationId")),
        404,
      );
    const revokedAt = now().toISOString();
    await repository.revokeSession(input.data.sessionId, revokedAt);
    await repository.saveAuditEvent({
      id: await stableIdentityRecordId("session-revoked", session.userId, input.data.sessionId),
      actorUserId: session.userId,
      action: "identity.session-revoked",
      targetType: "session",
      targetId: input.data.sessionId,
      occurredAt: revokedAt,
      metadata: {},
    });
    return context.json(
      { data: { revoked: true }, meta: { correlationId: context.get("correlationId") } },
      200,
    );
  });

  app.post("/api/v1/account/sessions/revoke-all", async (context) => {
    const session = context.get("session");
    if (!session)
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "authentication is required",
          context.get("correlationId"),
        ),
        401,
      );
    const bindings = context.env ?? {};
    const repository =
      options.identityRepository ??
      (bindings.DB ? new D1IdentityRepository(bindings.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "IDENTITY_UNAVAILABLE",
          "identity operations are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const revokedAt = now().toISOString();
    await repository.revokeAllSessions(session.userId, revokedAt);
    await repository.saveAuditEvent({
      id: await stableIdentityRecordId("sessions-revoked", session.userId, session.id),
      actorUserId: session.userId,
      action: "identity.sessions-revoked",
      targetType: "user",
      targetId: session.userId,
      occurredAt: revokedAt,
      metadata: { initiatingSessionId: session.id },
    });
    return context.json(
      { data: { revoked: true }, meta: { correlationId: context.get("correlationId") } },
      200,
    );
  });

  app.get("/api/v1/account/deletion-eligibility", async (context) => {
    const session = context.get("session");
    if (!session)
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "authentication is required",
          context.get("correlationId"),
        ),
        401,
      );
    const bindings = context.env ?? {};
    const repository =
      options.identityRepository ??
      (bindings.DB ? new D1IdentityRepository(bindings.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "IDENTITY_UNAVAILABLE",
          "identity operations are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const reasons = session.customerId
      ? await repository.findDeletionBlockingReasons(session.customerId)
      : ["ROLE_REQUIRES_ADMIN_REVIEW"];
    const body = {
      data: { eligible: reasons.length === 0, reasons: [...reasons] },
      meta: { correlationId: context.get("correlationId") },
    };
    accountDeletionEligibilityResponseSchema.parse(body);
    return context.json(body, 200);
  });

  app.post("/api/v1/account/deletion-request", async (context) => {
    const session = context.get("session");
    if (!session)
      return context.json(
        errorResponse(
          "UNAUTHENTICATED",
          "authentication is required",
          context.get("correlationId"),
        ),
        401,
      );
    const bindings = context.env ?? {};
    const repository =
      options.identityRepository ??
      (bindings.DB ? new D1IdentityRepository(bindings.DB) : undefined);
    if (!repository)
      return context.json(
        errorResponse(
          "IDENTITY_UNAVAILABLE",
          "identity operations are unavailable",
          context.get("correlationId"),
        ),
        503,
      );
    const reasons = session.customerId
      ? await repository.findDeletionBlockingReasons(session.customerId)
      : ["ROLE_REQUIRES_ADMIN_REVIEW"];
    const idempotencyKey = context.req.header("idempotency-key")?.trim() || "account-deletion";
    const fingerprint = JSON.stringify({ request: "account-deletion", reasons });
    const previous = await repository.findCommandResult(
      session.userId,
      "deletion-request",
      idempotencyKey,
    );
    if (previous) {
      if (previous.requestFingerprint !== fingerprint)
        return context.json(
          errorResponse(
            "IDEMPOTENCY_CONFLICT",
            "idempotency key was reused for a different deletion request",
            context.get("correlationId"),
          ),
          409,
        );
      const replay = {
        data: previous.result,
        meta: { correlationId: context.get("correlationId") },
      };
      accountDeletionRequestResponseSchema.parse(replay);
      return context.json(replay, previous.responseStatus as 200 | 409);
    }
    const requestedAt = now().toISOString();
    const result = {
      requested: reasons.length === 0,
      eligible: reasons.length === 0,
      reasons: [...reasons],
    };
    await repository.saveAuditEvent({
      id: await stableIdentityRecordId("deletion-request", session.userId, idempotencyKey),
      actorUserId: session.userId,
      action: "identity.account-deletion-requested",
      targetType: "user",
      targetId: session.userId,
      occurredAt: requestedAt,
      metadata: { eligible: String(result.eligible), reasons: reasons.join("|") || "none" },
    });
    await repository.saveCommandResult({
      userId: session.userId,
      command: "deletion-request",
      idempotencyKey,
      requestFingerprint: fingerprint,
      responseStatus: result.eligible ? 202 : 409,
      result,
      createdAt: requestedAt,
    });
    const body = { data: result, meta: { correlationId: context.get("correlationId") } };
    accountDeletionRequestResponseSchema.parse(body);
    return context.json(body, result.eligible ? 202 : 409);
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

function readSignedMediaRequest(context: ApiContext, includeContentType: boolean) {
  const objectKey = context.req.query("objectKey")?.trim();
  const expiresAt = context.req.query("expiresAt")?.trim();
  const signature = context.req.query("signature")?.trim();
  const contentType = context.req.query("contentType")?.trim();
  if (!objectKey || !expiresAt || !signature || (includeContentType && !contentType)) return null;
  return {
    objectKey,
    expiresAt,
    signature,
    ...(contentType ? { contentType } : {}),
  };
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

function paymentAttemptResponse(
  attempt: {
    id: string;
    orderId: string;
    amount: { centavos: number; currency: "PHP" };
    status: "pending" | "succeeded" | "failed";
    providerReference: string | null;
    failureCode: string | null;
    createdAt: string;
    updatedAt: string;
  },
  correlationId: string,
) {
  return {
    data: {
      id: attempt.id,
      orderId: attempt.orderId,
      amount: attempt.amount,
      status: attempt.status,
      providerReference: attempt.providerReference,
      failureCode: attempt.failureCode,
      createdAt: attempt.createdAt,
      updatedAt: attempt.updatedAt,
    },
    meta: { correlationId },
  };
}

function toAccountProfile(profile: IdentityUser) {
  return {
    userId: profile.id,
    email: profile.email,
    name: profile.name,
    emailVerified: profile.emailVerified,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

async function stableIdentityRecordId(prefix: string, ...parts: string[]): Promise<string> {
  const input = new TextEncoder().encode(parts.join("\u0000"));
  const digest = await crypto.subtle.digest("SHA-256", input);
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${prefix}-${hash}`;
}

function requiresTrustedOrigin(method: string, path: string): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return false;
  }
  return !path.startsWith("/api/v1/payments/webhooks/");
}

function requiresMfa(method: string, path: string): boolean {
  if (path.startsWith("/api/v1/admin/")) return true;
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
  return (
    path === "/api/v1/payments/charge" ||
    path.startsWith("/api/v1/payments/methods") ||
    path === "/api/v1/admin/payments/refunds"
  );
}

function toDeliveryAddressData(
  address: {
    recipientName: string;
    phone: string;
    line1: string;
    line2: string | null;
    barangay: string;
    city: string;
    province: string;
    postalCode: string;
    instructions: string | null;
    createdAt: string;
    updatedAt: string;
  },
  serviceable: boolean,
) {
  return {
    recipientName: address.recipientName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    barangay: address.barangay,
    city: address.city,
    province: address.province,
    postalCode: address.postalCode,
    instructions: address.instructions,
    serviceable,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

function toSupportCaseData(caseRecord: SupportCase) {
  return {
    id: caseRecord.id,
    customerId: caseRecord.customerId,
    subject: caseRecord.subject,
    message: caseRecord.message,
    status: caseRecord.status,
    createdAt: caseRecord.createdAt,
    updatedAt: caseRecord.updatedAt,
  };
}

function toCustomerOrderSubstitutionData(substitution: CustomerOrderSubstitution) {
  return {
    id: substitution.id,
    customerId: substitution.customerId,
    orderId: substitution.orderId,
    shortageId: substitution.shortageId,
    originalSkuId: substitution.originalSkuId,
    procurementSubstitutionId: substitution.procurementSubstitutionId,
    substituteSkuId: substitution.substituteSkuId,
    quantity: substitution.quantity,
    status: substitution.status,
    decidedAt: substitution.decidedAt,
    createdAt: substitution.createdAt,
    updatedAt: substitution.updatedAt,
  };
}

async function saveOptionalAudit(
  configured: AccountIdentityRepository | undefined,
  bindings: ApiBindings,
  event: Omit<Parameters<AccountIdentityRepository["saveAuditEvent"]>[0], "id">,
): Promise<void> {
  const repository =
    configured ?? (bindings.DB ? new D1IdentityRepository(bindings.DB) : undefined);
  if (!repository) return;
  await repository.saveAuditEvent({ id: crypto.randomUUID(), ...event });
}

function resolveServiceability(
  postalCode: string,
  options: ApiOptions,
  bindings: ApiBindings,
): boolean {
  if (options.serviceablePostalCodes) return options.serviceablePostalCodes.includes(postalCode);
  if (bindings.DELIVERY_SERVICE_POSTAL_CODES !== undefined) {
    return parsePostalCodeAllowlist(bindings.DELIVERY_SERVICE_POSTAL_CODES).includes(postalCode);
  }
  return (
    bindings.APP_ENV === undefined ||
    bindings.APP_ENV === "development" ||
    bindings.APP_ENV === "test"
  );
}

function parsePostalCodeAllowlist(value: string | undefined): readonly string[] {
  return value
    ? value
        .split(",")
        .map((code) => code.trim())
        .filter((code) => /^\d{4}$/.test(code))
    : [];
}

function errorResponse(code: string, message: string, correlationId: string): ApiErrorResponse {
  return {
    error: { code, message },
    meta: { correlationId },
  };
}

function isSameDeliveryMediaRequest(
  record: DeliveryMediaRecord,
  input: {
    orderId: string;
    assignmentId: string;
    kind: "proof_of_delivery";
    contentType: string;
    sizeBytes: number;
  },
  uploadedByUserId: string,
): boolean {
  return (
    record.orderId === input.orderId &&
    record.assignmentId === input.assignmentId &&
    record.uploadedByUserId === uploadedByUserId &&
    record.kind === input.kind &&
    record.contentType === input.contentType &&
    record.sizeBytes === input.sizeBytes
  );
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

function readOperationalAlertThresholds(
  bindings: ApiBindings,
): Partial<OperationalAlertThresholds> {
  const thresholds: Partial<OperationalAlertThresholds> = {};
  addThreshold(thresholds, "pendingOutboxCount", bindings.OPERATIONAL_ALERT_PENDING_COUNT);
  addThreshold(
    thresholds,
    "pendingOutboxAgeSeconds",
    bindings.OPERATIONAL_ALERT_PENDING_AGE_SECONDS,
  );
  addThreshold(
    thresholds,
    "deadLetteredOutboxCount",
    bindings.OPERATIONAL_ALERT_DEAD_LETTERED_COUNT,
  );
  addThreshold(thresholds, "failedDeliveryCount", bindings.OPERATIONAL_ALERT_FAILED_DELIVERY_COUNT);
  addThreshold(thresholds, "openShortageCount", bindings.OPERATIONAL_ALERT_OPEN_SHORTAGE_COUNT);
  addThreshold(
    thresholds,
    "exceptionalManifestCount",
    bindings.OPERATIONAL_ALERT_EXCEPTIONAL_MANIFEST_COUNT,
  );
  return thresholds;
}

function addThreshold(
  thresholds: Partial<OperationalAlertThresholds>,
  key: keyof OperationalAlertThresholds,
  value: string | undefined,
): void {
  const parsed = readPositiveInteger(value);
  if (parsed !== undefined) {
    (thresholds as { -readonly [K in keyof OperationalAlertThresholds]?: number })[key] = parsed;
  }
}

function readPositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function checkoutQuoteBody(
  quote: Awaited<ReturnType<CheckoutPricingService["quote"]>>,
  correlationId: string,
) {
  return {
    data: {
      originalSubtotal: quote.originalSubtotal,
      discount: quote.discount,
      deliveryFee: quote.totals.deliveryFee,
      weeklyFee: quote.totals.weeklyFee,
      includedCredit: quote.totals.includedCredit,
      overage: quote.totals.overage,
      totalDue: quote.totals.totalDue,
      promotionCode: quote.promotionCode,
    },
    meta: { correlationId },
  };
}

function promotionErrorCode(message: string): string {
  if (message.includes("not found")) return "PROMOTION_NOT_FOUND";
  if (message.includes("not active")) return "PROMOTION_NOT_ACTIVE";
  if (message.includes("minimum subtotal")) return "PROMOTION_MINIMUM_NOT_MET";
  if (message.includes("plan") || message.includes("products") || message.includes("categories"))
    return "PROMOTION_NOT_ELIGIBLE";
  if (message.includes("first order") || message.includes("first week"))
    return "PROMOTION_NOT_ELIGIBLE";
  if (message.includes("customer redemption")) return "PROMOTION_CUSTOMER_LIMIT_REACHED";
  if (message.includes("redemption limit")) return "PROMOTION_LIMIT_REACHED";
  if (message.includes("budget") || message.includes("campaign limits"))
    return "PROMOTION_EXHAUSTED";
  if (message.includes("invalid")) return "INVALID_PROMOTION_CODE";
  return "PROMOTION_REJECTED";
}

const defaultRateLimitPolicies: readonly ApiRateLimitPolicy[] = [
  {
    name: "auth",
    maxRequests: 10,
    windowSeconds: 60,
    methods: ["POST"],
    pathPrefixes: ["/api/auth/"],
  },
  {
    name: "write",
    maxRequests: 60,
    windowSeconds: 60,
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    pathPrefixes: ["/api/v1/"],
  },
];

function resolveRateLimitPolicy(
  method: string,
  path: string,
  policies: readonly ApiRateLimitPolicy[],
): ApiRateLimitPolicy | undefined {
  return policies.find(
    (policy) =>
      policy.methods.includes(method) &&
      policy.pathPrefixes.some((prefix) => path.startsWith(prefix)),
  );
}

function resolveClientKey(headers: Headers): string {
  const forwardedFor = headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for");
  const firstAddress = forwardedFor?.split(",", 1)[0]?.trim();
  return firstAddress || "anonymous";
}
