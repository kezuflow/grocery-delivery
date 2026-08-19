import { describe, expect, it } from "vitest";

import { InMemoryRequestRateLimiter } from "./rate-limit.js";

describe("in-memory request rate limiter", () => {
  const policy = { name: "test", maxRequests: 2, windowSeconds: 10 };

  it("allows up to the limit and then reports retry metadata", async () => {
    const limiter = new InMemoryRequestRateLimiter();
    const now = new Date("2026-08-19T00:00:00.000Z");

    await expect(limiter.check({ key: "client-a", policy, now })).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
    await expect(limiter.check({ key: "client-a", policy, now })).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
    await expect(limiter.check({ key: "client-a", policy, now })).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 10,
    });
  });

  it("isolates keys and resets after the window", async () => {
    const limiter = new InMemoryRequestRateLimiter();
    const start = new Date("2026-08-19T00:00:00.000Z");

    await limiter.check({ key: "client-a", policy, now: start });
    await expect(limiter.check({ key: "client-b", policy, now: start })).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
    });
    await expect(
      limiter.check({ key: "client-a", policy, now: new Date(start.getTime() + 10_000) }),
    ).resolves.toMatchObject({ allowed: true, remaining: 1 });
  });
});
