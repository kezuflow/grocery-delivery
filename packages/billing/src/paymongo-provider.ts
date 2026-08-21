import { createMoney } from "@carbon/domain";

import {
  PaymentProviderError,
  type ChargeInput,
  type ChargeResult,
  type CreateCustomerInput,
  type CreatePaymentMethodInput,
  type PaymentCapabilities,
  type PaymentMethodRevocationResult,
  type PaymentProvider,
  type ProviderCustomer,
  type ProviderPaymentMethod,
  type ReconcileInput,
  type ReconciliationResult,
  type RefundInput,
  type RefundResult,
  type ProviderRevokePaymentMethodInput,
  type VerifiedWebhook,
  type VerifyWebhookInput,
} from "./provider.js";

export type PayMongoPaymentProviderOptions = Readonly<{
  secretKey: string;
  apiUrl?: string;
  fetcher?: typeof fetch;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
  maxRateLimitRetries?: number;
}>;

const CAPABILITIES: PaymentCapabilities = Object.freeze({
  tokenizedCharges: true,
  paymentMethodRevocation: true,
  mandates: true,
  invoices: false,
  refunds: true,
  webhookVerification: true,
  reconciliation: true,
});

/** Thin HTTP adapter. Provider-specific JSON stays here; application code sees PaymentProvider. */
export class PayMongoPaymentProvider implements PaymentProvider {
  readonly name = "paymongo";
  private readonly apiUrl: string;
  private readonly fetcher: typeof fetch;
  private readonly now: () => Date;
  private readonly secretKey: string;

  constructor(options: PayMongoPaymentProviderOptions) {
    if (!options.secretKey.trim()) {
      throw new PaymentProviderError("PROVIDER_CONFIGURATION", "secret key is required");
    }
    this.apiUrl = (options.apiUrl ?? "https://api.paymongo.com").replace(/\/$/, "");
    this.fetcher = options.fetcher ?? ((input, init) => globalThis.fetch(input, init));
    this.now = options.now ?? (() => new Date());
    this.secretKey = options.secretKey;
  }

  capabilities(): PaymentCapabilities {
    return CAPABILITIES;
  }

  async createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer> {
    const data = await this.request("POST", "/v1/customers", input.idempotencyKey, {
      data: { attributes: { email: input.email, reference_number: input.customerId } },
    });
    return { reference: stringField(data, "id"), customerId: input.customerId };
  }

  async createPaymentMethod(input: CreatePaymentMethodInput): Promise<ProviderPaymentMethod> {
    const data = await this.request("POST", "/v1/payment_methods", input.idempotencyKey, {
      data: {
        attributes: { type: input.type, token: input.token },
        relationships: { customer: { data: { id: input.customerReference, type: "customers" } } },
      },
    });
    return {
      reference: stringField(data, "id"),
      customerReference: input.customerReference,
      type: input.type,
      status: "active",
    };
  }

  async revokePaymentMethod(
    input: ProviderRevokePaymentMethodInput,
  ): Promise<PaymentMethodRevocationResult> {
    await this.request(
      "DELETE",
      `/v1/payment_methods/${encodeURIComponent(input.paymentMethodReference)}`,
      input.idempotencyKey,
      undefined,
    );
    return { status: "revoked" };
  }

  async charge(input: ChargeInput): Promise<ChargeResult> {
    const data = await this.request("POST", "/v1/payment_intents", input.idempotencyKey, {
      data: {
        attributes: {
          amount: input.amount.centavos,
          currency: "PHP",
          payment_method_allowed: ["card"],
          description: input.paymentAttemptId,
        },
        relationships: {
          payment_method: { data: { id: input.paymentMethodReference, type: "payment_methods" } },
        },
      },
    });
    const attributes = recordField(data, "attributes");
    return {
      reference: stringField(data, "id"),
      status: mapStatus(attributes.status),
      amount: input.amount,
      failureCode: stringOrNull(attributes.last_payment_error),
      processedAt: stringOrDefault(attributes.updated_at, this.now().toISOString()),
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    const data = await this.request("POST", "/v1/refunds", input.idempotencyKey, {
      data: {
        attributes: {
          amount: input.amount.centavos,
          payment_id: input.chargeReference,
          reason: input.reason,
        },
      },
    });
    const attributes = recordField(data, "attributes");
    return {
      reference: stringField(data, "id"),
      chargeReference: input.chargeReference,
      status: attributes.status === "succeeded" ? "succeeded" : "failed",
      amount: input.amount,
      processedAt: stringOrDefault(attributes.updated_at, this.now().toISOString()),
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedWebhook> {
    const expected = await hmacHex(this.secretKey, input.rawBody);
    if (!timingSafeEqual(expected, input.signature.trim().toLowerCase())) {
      throw new PaymentProviderError(
        "INVALID_WEBHOOK_SIGNATURE",
        "payment webhook signature is invalid",
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(input.rawBody);
    } catch {
      throw new PaymentProviderError("INVALID_WEBHOOK", "payment webhook body is invalid JSON");
    }
    const root = asRecord(payload);
    const data = asRecord(root.data);
    return {
      id: stringField(data, "id"),
      type: stringField(data, "type") as VerifiedWebhook["type"],
      occurredAt: stringOrDefault(root.occurred_at, this.now().toISOString()),
      data: asRecord(data.attributes),
    };
  }

  async reconcile(input: ReconcileInput): Promise<ReconciliationResult> {
    const payload = await this.requestPayload(
      "GET",
      `/v1/payments?created_at.gte=${encodeURIComponent(input.from)}&created_at.lte=${encodeURIComponent(input.to)}&limit=100`,
      undefined,
      undefined,
    );
    const data = asRecord(payload);
    const entries = Array.isArray(data.data)
      ? data.data.map((entry) => {
          const value = asRecord(entry);
          const attributes = asRecord(value.attributes);
          return {
            reference: stringField(value, "id"),
            type: "charge" as const,
            status: mapStatus(attributes.status),
            amount: createMoney(numberField(attributes.amount)),
            occurredAt: timestampOrDefault(
              attributes.created_at ?? attributes.updated_at,
              input.to,
            ),
          };
        })
      : [];
    return { entries };
  }

  private async request(
    method: string,
    path: string,
    idempotencyKey: string | undefined,
    body: unknown,
  ): Promise<Record<string, unknown>> {
    const payload = await this.requestPayload(method, path, idempotencyKey, body);
    return asRecord(asRecord(payload).data ?? payload);
  }

  private async requestPayload(
    method: string,
    path: string,
    idempotencyKey: string | undefined,
    body: unknown,
  ): Promise<unknown> {
    const request = () =>
      this.fetcher(`${this.apiUrl}${path}`, {
        method,
        headers: {
          accept: "application/json",
          authorization: `Basic ${encodeBase64(`${this.secretKey}:`)}`,
          ...(body ? { "content-type": "application/json" } : {}),
          ...(idempotencyKey ? { "idempotency-key": idempotencyKey } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

    const response = await request();
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new PaymentProviderError(
        `PROVIDER_HTTP_${response.status}`,
        `PayMongo request failed with status ${response.status}`,
      );
    return payload;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
function recordField(value: Record<string, unknown>, key: string): Record<string, unknown> {
  return asRecord(value[key]);
}
function stringField(value: Record<string, unknown>, key: string): string {
  const result = value[key];
  if (typeof result !== "string" || !result)
    throw new PaymentProviderError(
      "PROVIDER_RESPONSE_INVALID",
      `provider response is missing ${key}`,
    );
  return result;
}
function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}
function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}
function timestampOrDefault(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }
  return stringOrDefault(value, fallback);
}
function numberField(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 1;
}
function mapStatus(value: unknown): ChargeResult["status"] {
  return value === "succeeded" || value === "paid"
    ? "succeeded"
    : value === "failed"
      ? "failed"
      : "pending";
}
function encodeBase64(value: string): string {
  return btoa(value);
}
async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
function timingSafeEqual(left: string, right: string): boolean {
  return left.length === right.length && [...left].every((char, index) => char === right[index]);
}
