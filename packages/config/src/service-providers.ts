import {
  ConfigurationError,
  parseAllowedOrigins,
  parseRuntimeEnvironment,
  type RuntimeEnvironment,
} from "./runtime-environment.js";

export const AUTH_MODES = ["persistent-session", "better-auth"] as const;
export const PAYMENT_PROVIDERS = ["disabled", "fake", "paymongo"] as const;

export type AuthMode = (typeof AUTH_MODES)[number];
export type PaymentProviderName = (typeof PAYMENT_PROVIDERS)[number];

export type ApiRuntimeConfiguration = Readonly<{
  environment: RuntimeEnvironment;
  authMode: AuthMode;
  paymentProvider: PaymentProviderName;
  betterAuthSecret: string | null;
  betterAuthUrl: string | null;
  betterAuthTrustedOrigins: readonly string[];
  adminBootstrapEmails: readonly string[];
  paymongoSecretKey: string | null;
  paymongoApiUrl: string;
}>;

export function parseApiRuntimeConfiguration(bindings: {
  APP_ENV?: string;
  AUTH_MODE?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  CORS_ORIGINS?: string;
  PAYMENT_PROVIDER?: string;
  ADMIN_BOOTSTRAP_EMAILS?: string;
  PAYMONGO_SECRET_KEY?: string;
  PAYMONGO_API_URL?: string;
}): ApiRuntimeConfiguration {
  const environment = parseRuntimeEnvironment(bindings.APP_ENV);
  const authMode = parseOption("AUTH_MODE", bindings.AUTH_MODE ?? "persistent-session", AUTH_MODES);
  const paymentProvider = parseOption(
    "PAYMENT_PROVIDER",
    bindings.PAYMENT_PROVIDER ?? "disabled",
    PAYMENT_PROVIDERS,
  );
  const paymongoSecretKey = bindings.PAYMONGO_SECRET_KEY?.trim() || null;
  const paymongoApiUrl = normalizeApiUrl(bindings.PAYMONGO_API_URL, "https://api.paymongo.com");

  if (paymentProvider === "fake" && environment !== "development" && environment !== "test") {
    throw new ConfigurationError(
      "PAYMENT_PROVIDER",
      "the fake payment provider is limited to development and test environments",
    );
  }
  if (paymentProvider === "paymongo" && !paymongoSecretKey) {
    throw new ConfigurationError(
      "PAYMONGO_SECRET_KEY",
      "PAYMONGO_SECRET_KEY is required when PAYMENT_PROVIDER selects paymongo",
    );
  }

  const betterAuthSecret = bindings.BETTER_AUTH_SECRET?.trim() || null;
  const betterAuthUrl = normalizeBetterAuthUrl(bindings.BETTER_AUTH_URL, environment);
  const betterAuthTrustedOrigins = Object.freeze([
    ...parseAllowedOrigins(bindings.CORS_ORIGINS, environment),
  ]);
  const adminBootstrapEmails = Object.freeze(
    (bindings.ADMIN_BOOTSTRAP_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  if (
    authMode === "persistent-session" &&
    environment !== "development" &&
    environment !== "test"
  ) {
    throw new ConfigurationError(
      "AUTH_MODE",
      "persistent-session authentication is limited to development and test environments",
    );
  }
  if (authMode === "better-auth") {
    if (!betterAuthSecret || betterAuthSecret.length < 32) {
      throw new ConfigurationError(
        "BETTER_AUTH_SECRET",
        "BETTER_AUTH_SECRET is required and must be at least 32 characters when AUTH_MODE selects better-auth",
      );
    }
    if (!betterAuthUrl) {
      throw new ConfigurationError(
        "BETTER_AUTH_URL",
        "BETTER_AUTH_URL is required when AUTH_MODE selects better-auth",
      );
    }
    if (
      environment !== "development" &&
      environment !== "test" &&
      !betterAuthUrl.startsWith("https://")
    ) {
      throw new ConfigurationError(
        "BETTER_AUTH_URL",
        "BETTER_AUTH_URL must use HTTPS outside development and test environments",
      );
    }
    if (
      environment !== "development" &&
      environment !== "test" &&
      betterAuthTrustedOrigins.length === 0
    ) {
      throw new ConfigurationError(
        "CORS_ORIGINS",
        "at least one trusted HTTPS origin is required for Better Auth deployments",
      );
    }
  }
  if (paymentProvider === "disabled" && environment !== "development" && environment !== "test") {
    throw new ConfigurationError(
      "PAYMENT_PROVIDER",
      "disabled payment provider is limited to development and test environments",
    );
  }

  return Object.freeze({
    environment,
    authMode,
    paymentProvider,
    betterAuthSecret,
    betterAuthUrl,
    betterAuthTrustedOrigins,
    adminBootstrapEmails,
    paymongoSecretKey,
    paymongoApiUrl,
  });
}

function normalizeApiUrl(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new ConfigurationError("PAYMONGO_API_URL", "PAYMONGO_API_URL must be a valid URL");
  }
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash) {
    throw new ConfigurationError("PAYMONGO_API_URL", "PAYMONGO_API_URL must be an HTTPS origin");
  }
  return url.origin;
}

function normalizeBetterAuthUrl(
  value: string | undefined,
  environment: RuntimeEnvironment,
): string | null {
  if (!value?.trim()) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ConfigurationError("BETTER_AUTH_URL", "BETTER_AUTH_URL must be a valid absolute URL");
  }
  const local =
    environment === "development" &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) {
    throw new ConfigurationError(
      "BETTER_AUTH_URL",
      "BETTER_AUTH_URL must use HTTPS outside local development",
    );
  }
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new ConfigurationError("BETTER_AUTH_URL", "BETTER_AUTH_URL must contain only an origin");
  }
  return url.origin;
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
