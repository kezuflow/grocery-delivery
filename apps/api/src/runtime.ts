import type { BetterAuthApi } from "@carbon/auth";
import { FakePaymentProvider } from "@carbon/billing";
import type { PaymentProvider } from "@carbon/billing";
import {
  ConfigurationError,
  parseApiRuntimeConfiguration,
  type ApiRuntimeConfiguration,
} from "@carbon/config";
import { resolveCorrelationId } from "@carbon/observability";
import type { IdentityEmailSender } from "@carbon/notifications";
import { InMemoryIdentityEmailSender } from "@carbon/notifications";

import { createApi, type ApiApp, type ApiBindings } from "./app.js";
import { createConfiguredBetterAuthApi } from "./better-auth.js";

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

  return createApi({
    ...(betterAuthApi ? { betterAuthApi } : {}),
    ...(paymentProvider ? { paymentProvider } : {}),
  });
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
    !factories.createIdentityEmailSender
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
        factories.createIdentityEmailSender?.() ?? new InMemoryIdentityEmailSender(),
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
  if (!factories.createPaymentProvider) {
    throw new ConfigurationError(
      "PAYMENT_PROVIDER",
      `PAYMENT_PROVIDER selects ${selectedProvider}, but no runtime factory is configured`,
    );
  }
  return factories.createPaymentProvider(bindings, configuration);
}
