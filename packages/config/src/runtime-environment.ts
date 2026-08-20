export const RUNTIME_ENVIRONMENTS = ["development", "test", "staging", "production"] as const;

export type RuntimeEnvironment = (typeof RUNTIME_ENVIRONMENTS)[number];

export class ConfigurationError extends Error {
  readonly key: string;

  constructor(key: string, message: string) {
    super(message);
    this.name = "ConfigurationError";
    this.key = key;
  }
}

export function parseRuntimeEnvironment(value: string | undefined): RuntimeEnvironment {
  const environment = value ?? "development";

  if (!RUNTIME_ENVIRONMENTS.some((candidate) => candidate === environment)) {
    throw new ConfigurationError(
      "APP_ENV",
      `APP_ENV must be one of: ${RUNTIME_ENVIRONMENTS.join(", ")}`,
    );
  }

  return environment as RuntimeEnvironment;
}

export function parseAllowedOrigins(
  value: string | undefined,
  environment: RuntimeEnvironment,
): readonly string[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => normalizeOrigin(origin, environment));
}

export function parseConfiguredOrigin(
  value: string | undefined,
  key: string,
  environment: RuntimeEnvironment,
): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return normalizeOrigin(value.trim(), environment);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw new ConfigurationError(key, error.message.replace("CORS_ORIGINS", key));
    }
    throw error;
  }
}

function normalizeOrigin(origin: string, environment: RuntimeEnvironment): string {
  let url: URL;

  try {
    url = new URL(origin);
  } catch {
    throw new ConfigurationError("CORS_ORIGINS", `invalid origin: ${origin}`);
  }

  const isLocalDevelopmentOrigin =
    environment === "development" &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);

  if (url.protocol !== "https:" && !isLocalDevelopmentOrigin) {
    throw new ConfigurationError("CORS_ORIGINS", `origin must use HTTPS: ${origin}`);
  }

  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new ConfigurationError("CORS_ORIGINS", `origin must not include a path: ${origin}`);
  }

  return url.origin;
}
