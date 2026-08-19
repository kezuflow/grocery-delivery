import {
  ConfigurationError,
  parseRuntimeEnvironment,
  type RuntimeEnvironment,
} from "./runtime-environment.js";

export const AUTH_MODES = ["persistent-session", "better-auth"] as const;
export const PAYMENT_PROVIDERS = ["disabled", "fake"] as const;

export type AuthMode = (typeof AUTH_MODES)[number];
export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

export type ApiRuntimeConfiguration = Readonly<{
  environment: RuntimeEnvironment;
  authMode: AuthMode;
  paymentProvider: PaymentProviderName;
}>;

export function parseApiRuntimeConfiguration(bindings: {
  APP_ENV?: string;
  AUTH_MODE?: string;
  PAYMENT_PROVIDER?: string;
}): ApiRuntimeConfiguration {
  const environment = parseRuntimeEnvironment(bindings.APP_ENV);
  const authMode = parseOption("AUTH_MODE", bindings.AUTH_MODE ?? "persistent-session", AUTH_MODES);
  const paymentProvider = parseOption(
    "PAYMENT_PROVIDER",
    bindings.PAYMENT_PROVIDER ?? "disabled",
    PAYMENT_PROVIDERS,
  );

  if (paymentProvider === "fake" && environment !== "development" && environment !== "test") {
    throw new ConfigurationError(
      "PAYMENT_PROVIDER",
      "the fake payment provider is limited to development and test environments",
    );
  }

  return Object.freeze({ environment, authMode, paymentProvider });
}

function parseOption<const T extends readonly string[]>(
  key: string,
  value: string,
  options: T,
): T[number] {
  if (!options.includes(value)) {
    throw new ConfigurationError(key, `${key} must be one of: ${options.join(", ")}`);
  }
  return value;
}
