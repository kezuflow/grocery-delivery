import { describe, expect, it } from "vitest";

import { createMoney } from "@carbon/domain";

import { PayMongoPaymentProvider } from "./paymongo-provider.js";

describe("PayMongo payment provider", () => {
  it("sends provider tokens and idempotency headers without raw credentials", async () => {
    const requests: Request[] = [];
    const provider = new PayMongoPaymentProvider({
      secretKey: "sk_test_secret",
      fetcher: (input, init) => {
        requests.push(new Request(input, init));
        return Promise.resolve(Response.json({ data: { id: "pm_123", attributes: {} } }));
      },
    });

    const method = await provider.createPaymentMethod({
      customerReference: "cus_123",
      type: "card",
      token: "tok_provider_only",
      idempotencyKey: "method-1",
    });

    expect(method.reference).toBe("pm_123");
    const request = requests[0];
    expect(request).toBeDefined();
    if (!request) throw new Error("expected provider request");
    expect(request.headers.get("idempotency-key")).toBe("method-1");
    expect(request.headers.get("authorization")).toMatch(/^Basic /);
    const body = await request.clone().text();
    expect(body).toContain("tok_provider_only");
    expect(body).not.toContain("card_number");
  });

  it("maps charge responses and surfaces provider failures", async () => {
    const provider = new PayMongoPaymentProvider({
      secretKey: "sk_test_secret",
      fetcher: () =>
        Promise.resolve(
          Response.json({
            data: {
              id: "pi_123",
              attributes: { status: "succeeded", updated_at: "2026-08-20T10:00:00.000Z" },
            },
          }),
        ),
    });
    await expect(
      provider.charge({
        paymentAttemptId: "attempt-1",
        customerReference: "cus_123",
        paymentMethodReference: "pm_123",
        amount: createMoney(6900),
        idempotencyKey: "charge-1",
      }),
    ).resolves.toMatchObject({
      reference: "pi_123",
      status: "succeeded",
      amount: createMoney(6900),
    });

    const failing = new PayMongoPaymentProvider({
      secretKey: "sk_test_secret",
      sleep: () => Promise.resolve(),
      fetcher: () => Promise.resolve(new Response("no", { status: 429 })),
    });
    await expect(
      failing.charge({
        paymentAttemptId: "attempt-1",
        customerReference: "cus_123",
        paymentMethodReference: "pm_123",
        amount: createMoney(6900),
        idempotencyKey: "charge-1",
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_HTTP_429" });
  });

  it("retries a rate-limited provider request after five seconds", async () => {
    let calls = 0;
    const waits: number[] = [];
    const provider = new PayMongoPaymentProvider({
      secretKey: "sk_test_secret",
      sleep: (milliseconds) => {
        waits.push(milliseconds);
        return Promise.resolve();
      },
      fetcher: () => {
        calls += 1;
        return Promise.resolve(
          calls === 1
            ? new Response("rate limited", { status: 429 })
            : Response.json({ data: { id: "cus_123", attributes: {} } }),
        );
      },
    });

    await expect(
      provider.createCustomer({
        customerId: "customer-1",
        email: "a@example.com",
        idempotencyKey: "customer-1",
      }),
    ).resolves.toMatchObject({ reference: "cus_123" });
    expect(calls).toBe(2);
    expect(waits).toEqual([5000]);
  });

  it("verifies signed webhook bodies", async () => {
    const body = JSON.stringify({
      data: { id: "evt_1", type: "charge.succeeded", attributes: { reference: "pi_1" } },
    });
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode("sk_test_secret"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = [
      ...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))),
    ]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const provider = new PayMongoPaymentProvider({ secretKey: "sk_test_secret" });
    await expect(provider.verifyWebhook({ rawBody: body, signature })).resolves.toMatchObject({
      id: "evt_1",
      type: "charge.succeeded",
    });
    await expect(provider.verifyWebhook({ rawBody: body, signature: "bad" })).rejects.toMatchObject(
      { code: "INVALID_WEBHOOK_SIGNATURE" },
    );
  });
});
