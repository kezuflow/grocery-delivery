import { describe, expect, it, vi } from "vitest";

import { createHttpApiTransport, forwardApiRequest } from "./runtime";

describe("web API runtime transport", () => {
  it("rebases internal API paths onto the configured local API origin", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json({ ok: true })),
    );
    const transport = createHttpApiTransport("http://localhost:8787", fetchImplementation);

    await transport.fetch(new URL("https://carbon-api.internal/api/v1/catalog?limit=12"));

    expect(fetchImplementation).toHaveBeenCalledWith(
      new URL("http://localhost:8787/api/v1/catalog?limit=12"),
      undefined,
    );
  });

  it("forwards auth cookies and preserves Better Auth session cookies", async () => {
    const fetchImplementation = vi.fn<typeof fetch>((input, init) => {
      const inputUrl = input instanceof URL ? input : input instanceof Request ? input.url : input;
      expect(new URL(inputUrl).pathname).toBe("/api/auth/sign-in/email");
      expect(new Headers(init?.headers).get("cookie")).toBe("existing=1");
      const headers = new Headers();
      headers.append("set-cookie", "better-auth.session_token=secret; HttpOnly; Path=/");
      return Promise.resolve(Response.json({ ok: true }, { headers }));
    });
    const request = new Request("https://web.example/api/auth/sign-in/email", {
      method: "POST",
      headers: { cookie: "existing=1", "content-type": "application/json" },
      body: JSON.stringify({ email: "customer@example.com", password: "secret123" }),
    });

    const response = await forwardApiRequest(
      request,
      createHttpApiTransport("https://api.example", fetchImplementation),
      "/api/auth/sign-in/email",
    );

    expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=secret");
  });

  it("forwards a JSON sign-out request body", async () => {
    const fetchImplementation = vi.fn<typeof fetch>((input, init) => {
      const inputUrl =
        input instanceof URL ? input : input instanceof Request ? input.url : new URL(input);
      expect(new URL(inputUrl).pathname).toBe("/api/auth/sign-out");
      expect(new Headers(init?.headers).get("content-type")).toBe("application/json");
      expect(init?.body).toBeInstanceOf(ArrayBuffer);
      return Promise.resolve(new Response(null, { status: 200 }));
    });

    const request = new Request("https://web.example/api/auth/sign-out", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const response = await forwardApiRequest(
      request,
      createHttpApiTransport("https://api.example", fetchImplementation),
      "/api/auth/sign-out",
    );

    expect(response.status).toBe(200);
  });
});
