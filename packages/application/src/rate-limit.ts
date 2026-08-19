export type RateLimitPolicy = Readonly<{
  name: string;
  maxRequests: number;
  windowSeconds: number;
}>;

export type RateLimitCheck = Readonly<{
  key: string;
  policy: RateLimitPolicy;
  now: Date;
}>;

export type RateLimitDecision = Readonly<{
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}>;

export interface RequestRateLimiter {
  check(input: RateLimitCheck): Promise<RateLimitDecision>;
}

type WindowState = Readonly<{
  windowStartedAt: number;
  requestCount: number;
}>;

/**
 * Fixed-window limiter for local development and tests. Production adapters can implement the
 * same interface with shared KV or Durable Object state.
 */
export class InMemoryRequestRateLimiter implements RequestRateLimiter {
  private readonly windows = new Map<string, WindowState>();

  check(input: RateLimitCheck): Promise<RateLimitDecision> {
    const { key, policy, now } = input;
    validatePolicy(policy);

    const currentTime = now.getTime();
    const windowLength = policy.windowSeconds * 1000;
    const current = this.windows.get(key);
    const windowStartedAt =
      current && currentTime - current.windowStartedAt < windowLength
        ? current.windowStartedAt
        : currentTime;
    const requestCount =
      current && windowStartedAt === current.windowStartedAt ? current.requestCount + 1 : 1;

    this.windows.set(key, { windowStartedAt, requestCount });

    const remaining = Math.max(policy.maxRequests - requestCount, 0);
    const retryAfterSeconds = Math.max(
      Math.ceil((windowStartedAt + windowLength - currentTime) / 1000),
      1,
    );

    return Promise.resolve({
      allowed: requestCount <= policy.maxRequests,
      limit: policy.maxRequests,
      remaining,
      retryAfterSeconds,
    });
  }
}

function validatePolicy(policy: RateLimitPolicy): void {
  if (
    !policy.name.trim() ||
    !Number.isSafeInteger(policy.maxRequests) ||
    policy.maxRequests < 1 ||
    !Number.isSafeInteger(policy.windowSeconds) ||
    policy.windowSeconds < 1
  ) {
    throw new Error("rate-limit policy must define positive integer limits");
  }
}
