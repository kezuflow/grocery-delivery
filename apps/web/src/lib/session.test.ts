import { describe, expect, it } from "vitest";

import { resolveCurrentSession } from "./session";
import type { ApiTransport } from "./api/client";

const meta = { correlationId: "session-test" };

describe("web session hydration", () => {
  it("forwards browser cookies and returns server-owned customer scope", async () => {
    const fetch: ApiTransport["fetch"] = (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const inputUrl = input instanceof URL ? input : input instanceof Request ? input.url : input;
      expect(new URL(inputUrl).pathname).toBe("/api/v1/me");
      expect(new Headers(init?.headers).get("cookie")).toBe("better-auth.session_token=secret");
      return Promise.resolve(
        Response.json({
          data: {
            sessionId: "session-1",
            userId: "user-1",
            role: "customer",
            adminPermissions: [],
            customerId: "customer-1",
            mfaRequired: false,
            mfaVerified: true,
            expiresAt: "2026-09-01T00:00:00.000Z",
          },
          meta,
        }),
      );
    };

    await expect(
      resolveCurrentSession({ fetch }, "better-auth.session_token=secret"),
    ).resolves.toMatchObject({
      session: { userId: "user-1", customerId: "customer-1" },
      error: null,
    });
  });

  it("treats an unauthenticated response as a signed-out state", async () => {
    const fetch: ApiTransport["fetch"] = (): Promise<Response> =>
      Promise.resolve(
        Response.json(
          { error: { code: "UNAUTHENTICATED", message: "sign in required" }, meta },
          { status: 401 },
        ),
      );

    await expect(resolveCurrentSession({ fetch }, "")).resolves.toEqual({
      session: null,
      error: null,
    });
  });
});
