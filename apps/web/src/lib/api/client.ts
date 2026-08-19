import {
  apiErrorResponseSchema,
  cartResponseSchema,
  cartUpdateRequestSchema,
  catalogListResponseSchema,
  currentSessionResponseSchema,
  orderCreateRequestSchema,
  orderResponseSchema,
  plansListResponseSchema,
  subscriptionActionRequestSchema,
  subscriptionResponseSchema,
  type CartResponse,
  type CartUpdateRequest,
  type CatalogListResponse,
  type CurrentSessionResponse,
  type OrderCreateRequest,
  type OrderResponse,
  type PlansListResponse,
  type SubscriptionActionRequest,
  type SubscriptionResponse,
} from "@carbon/contracts";

export type ApiTransport = Readonly<{
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}>;

export function createSameOriginApiTransport(
  fetchImplementation: typeof fetch = fetch,
): ApiTransport {
  return {
    fetch(input, init) {
      const url = new URL(
        input instanceof URL ? input.toString() : typeof input === "string" ? input : input.url,
      );
      return fetchImplementation(`${url.pathname}${url.search}`, init);
    },
  };
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export function createApiClient(transport: ApiTransport) {
  return {
    listPlans(): Promise<PlansListResponse> {
      return getJson(transport, "/api/v1/plans", plansListResponseSchema);
    },
    listCatalog(limit = 12): Promise<CatalogListResponse> {
      return getJson(transport, `/api/v1/catalog?limit=${limit}`, catalogListResponseSchema);
    },
    getCurrentSession(init?: RequestInit): Promise<CurrentSessionResponse> {
      return getJson(transport, "/api/v1/me", currentSessionResponseSchema, init);
    },
    getCurrentSubscription(init?: RequestInit): Promise<SubscriptionResponse> {
      return getJson(transport, "/api/v1/subscription", subscriptionResponseSchema, init);
    },
    getCart(init?: RequestInit): Promise<CartResponse> {
      return getJson(transport, "/api/v1/cart", cartResponseSchema, init);
    },
    updateCart(input: CartUpdateRequest, init?: RequestInit): Promise<CartResponse> {
      const payload = cartUpdateRequestSchema.parse(input);
      const headers = new Headers(init?.headers);
      headers.set("content-type", "application/json");
      return getJson(transport, "/api/v1/cart", cartResponseSchema, {
        ...init,
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
    },
    performSubscriptionAction(
      input: SubscriptionActionRequest,
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<SubscriptionResponse> {
      const payload = subscriptionActionRequestSchema.parse(input);
      const headers = new Headers(init?.headers);
      headers.set("content-type", "application/json");
      headers.set("idempotency-key", idempotencyKey);
      return getJson(transport, "/api/v1/subscription/actions", subscriptionResponseSchema, {
        ...init,
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    },
    createOrder(
      input: OrderCreateRequest = {},
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<OrderResponse> {
      const payload = orderCreateRequestSchema.parse(input);
      const headers = new Headers(init?.headers);
      headers.set("content-type", "application/json");
      headers.set("idempotency-key", idempotencyKey);
      return getJson(transport, "/api/v1/orders", orderResponseSchema, {
        ...init,
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    },
  };
}

async function getJson<T>(
  transport: ApiTransport,
  path: string,
  schema: { parse(value: unknown): T },
  init?: RequestInit,
): Promise<T> {
  const response = await transport.fetch(new URL(path, "https://carbon-api.internal"), init);
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = apiErrorResponseSchema.safeParse(payload);
    throw new ApiClientError(
      response.status,
      error.success ? error.data.error.code : "API_REQUEST_FAILED",
      error.success ? error.data.error.message : "The API request failed",
    );
  }

  return schema.parse(payload);
}
