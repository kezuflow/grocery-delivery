import type { BetterAuthApi } from "@carbon/auth";
import type { EventProcessor } from "@carbon/application";
import {
  FakePaymentProvider,
  PayMongoPaymentProvider,
  PaymentReconciliationService,
  type PaymentProvider,
} from "@carbon/billing";
import {
  ConfigurationError,
  parseApiRuntimeConfiguration,
  type ApiRuntimeConfiguration,
} from "@carbon/config";
import { resolveCorrelationId } from "@carbon/observability";
import type { IdentityEmailSender } from "@carbon/notifications";
import {
  CloudflareIdentityEmailSender,
  HttpNotificationTransport,
  InMemoryIdentityEmailSender,
} from "@carbon/notifications";
import {
  D1DeliveryMediaRepository,
  D1NotificationDeliveryReceiptRepository,
  D1NotificationPreferencesRepository,
  D1PaymentRepository,
} from "@carbon/db";
import { HmacDeliveryMediaSigner, R2DeliveryMediaObjectStore } from "@carbon/storage";

import { createApi, type ApiApp, type ApiBindings } from "./app.js";
import { createConfiguredBetterAuthApi } from "./better-auth.js";
import { createEventProcessorHandlers, createMediaRetentionHandler } from "./event-processors.js";

export type ApiRuntimeFactories = Readonly<{
  createBetterAuthApi?: (
    bindings: ApiBindings,
    configuration: ApiRuntimeConfiguration,
  ) => BetterAuthApi;
  createPaymentProvider?: (
    bindings: ApiBindings,
    configuration: ApiRuntimeConfiguration,
  ) => PaymentProvider;
  createIdentityEmailSender?: () => IdentityEmailSender;
  createEventProcessor?: (
    bindings: ApiBindings,
    configuration: ApiRuntimeConfiguration,
  ) => EventProcessor;
}>;

export type ApiWorker = ExportedHandler<ApiBindings>;

export function createApiWorker(factories: ApiRuntimeFactories = {}): ApiWorker {
  const applications = new WeakMap<object, ApiApp>();

  return {
    fetch(request, bindings, executionContext) {
      try {
        const cacheKey = bindings.DB ?? bindings;
        let application = applications.get(cacheKey);
        if (!application) {
          application = createConfiguredApi(bindings, factories);
          applications.set(cacheKey, application);
        }
        return application.fetch(request, bindings, executionContext);
      } catch (error) {
        if (!(error instanceof ConfigurationError)) {
          throw error;
        }
        const correlationId = resolveCorrelationId(
          request.headers.get("x-correlation-id") ?? undefined,
          () => crypto.randomUUID(),
        );
        return Response.json(
          {
            error: { code: "SERVICE_CONFIGURATION_INVALID", message: error.message },
            meta: { correlationId },
          },
          {
            status: 503,
            headers: { "x-correlation-id": correlationId, "cache-control": "no-store" },
          },
        );
      }
    },
  };
}

export function createConfiguredApi(
  bindings: ApiBindings,
  factories: ApiRuntimeFactories = {},
): ApiApp {
  const configuration = parseApiRuntimeConfiguration(bindings);
  const betterAuthApi = resolveBetterAuthApi(bindings, configuration, factories);
  const paymentProvider = resolvePaymentProvider(bindings, configuration, factories);
  const eventProcessor =
    factories.createEventProcessor?.(bindings, configuration) ??
    createConfiguredEventProcessor(bindings, paymentProvider);

  const mediaSigner = resolveDeliveryMediaSigner(bindings, configuration);
  return createApi({
    ...(betterAuthApi ? { betterAuthApi } : {}),
    ...(paymentProvider ? { paymentProvider } : {}),
    ...(eventProcessor ? { eventProcessor } : {}),
    ...(mediaSigner ? { mediaSigner } : {}),
    ...(bindings.EVENT_PROCESSOR_TOKEN
      ? { eventProcessorToken: bindings.EVENT_PROCESSOR_TOKEN }
      : {}),
  });
}

function resolveDeliveryMediaSigner(bindings: ApiBindings, configuration: ApiRuntimeConfiguration) {
  if (!bindings.MEDIA_BUCKET) return undefined;
  const secret = bindings.MEDIA_SIGNING_SECRET?.trim();
  const baseUrl = bindings.API_PUBLIC_ORIGIN?.trim();
  if (!secret || !baseUrl) {
    if (configuration.environment === "staging" || configuration.environment === "production") {
      throw new ConfigurationError(
        "MEDIA_SIGNING_SECRET",
        "deployed R2 delivery media requires MEDIA_SIGNING_SECRET and API_PUBLIC_ORIGIN",
      );
    }
    return undefined;
  }
  if (secret.length < 32) {
    throw new ConfigurationError(
      "MEDIA_SIGNING_SECRET",
      "MEDIA_SIGNING_SECRET must be at least 32 characters",
    );
  }
  return new HmacDeliveryMediaSigner(secret, baseUrl);
}

function createConfiguredEventProcessor(
  bindings: ApiBindings,
  paymentProvider: PaymentProvider | undefined,
): EventProcessor | undefined {
  const notificationTransport = bindings.NOTIFICATION_ENDPOINT
    ? new HttpNotificationTransport(bindings.NOTIFICATION_ENDPOINT, {
        ...(bindings.NOTIFICATION_TOKEN ? { token: bindings.NOTIFICATION_TOKEN } : {}),
      })
    : undefined;
  const paymentReconciliation =
    bindings.DB && paymentProvider
      ? new PaymentReconciliationService(new D1PaymentRepository(bindings.DB), paymentProvider)
      : undefined;
  const retention =
    bindings.DB && bindings.MEDIA_BUCKET
      ? createMediaRetentionHandler({
          repository: new D1DeliveryMediaRepository(bindings.DB),
          objectStore: new R2DeliveryMediaObjectStore(bindings.MEDIA_BUCKET),
          retentionDays: parseRetentionDays(bindings.DELIVERY_MEDIA_RETENTION_DAYS),
        })
      : undefined;
  return createEventProcessorHandlers({
    ...(notificationTransport ? { notificationTransport } : {}),
    ...(bindings.DB && notificationTransport
      ? {
          notificationPreferences: new D1NotificationPreferencesRepository(bindings.DB),
          notificationReceipts: new D1NotificationDeliveryReceiptRepository(bindings.DB),
        }
      : {}),
    ...(paymentReconciliation ? { paymentReconciliation } : {}),
    ...(retention ? { retention } : {}),
  });
}

function parseRetentionDays(value: string | undefined): number {
  const retentionDays = Number(value ?? 30);
  if (!Number.isInteger(retentionDays) || retentionDays <= 0 || retentionDays > 3650) {
    throw new ConfigurationError(
      "DELIVERY_MEDIA_RETENTION_DAYS",
      "delivery media retention days must be between 1 and 3650",
    );
  }
  return retentionDays;
}

function resolveBetterAuthApi(
  bindings: ApiBindings,
  configuration: ApiRuntimeConfiguration,
  factories: ApiRuntimeFactories,
): BetterAuthApi | undefined {
  if (configuration.authMode === "persistent-session") {
    return undefined;
  }
  if (
    (configuration.environment === "staging" || configuration.environment === "production") &&
    bindings.DB &&
    !factories.createIdentityEmailSender &&
    (!bindings.EMAIL || !bindings.EMAIL_FROM?.trim())
  ) {
    throw new ConfigurationError(
      "IDENTITY_EMAIL_SENDER",
      "deployed Better Auth requires an identity email sender",
    );
  }
  return factories.createBetterAuthApi
    ? factories.createBetterAuthApi(bindings, configuration)
    : createConfiguredBetterAuthApi(
        bindings,
        configuration,
        factories.createIdentityEmailSender?.() ??
          (bindings.EMAIL && bindings.EMAIL_FROM?.trim()
            ? new CloudflareIdentityEmailSender(bindings.EMAIL, bindings.EMAIL_FROM.trim())
            : new InMemoryIdentityEmailSender()),
      );
}

function resolvePaymentProvider(
  bindings: ApiBindings,
  configuration: ApiRuntimeConfiguration,
  factories: ApiRuntimeFactories,
): PaymentProvider | undefined {
  const selectedProvider: string = configuration.paymentProvider;
  if (selectedProvider === "disabled") {
    return undefined;
  }
  if (selectedProvider === "fake") {
    return new FakePaymentProvider();
  }
  if (selectedProvider === "paymongo") {
    if (!configuration.paymongoSecretKey) {
      throw new ConfigurationError("PAYMONGO_SECRET_KEY", "PayMongo secret key is required");
    }
    return new PayMongoPaymentProvider({
      secretKey: configuration.paymongoSecretKey,
      apiUrl: configuration.paymongoApiUrl,
    });
  }
  if (!factories.createPaymentProvider) {
    throw new ConfigurationError(
      "PAYMENT_PROVIDER",
      `PAYMENT_PROVIDER selects ${selectedProvider}, but no runtime factory is configured`,
    );
  }
  return factories.createPaymentProvider(bindings, configuration);
}
