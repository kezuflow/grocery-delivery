import {
  apiErrorResponseSchema,
  cartResponseSchema,
  cartUpdateRequestSchema,
  catalogListResponseSchema,
  currentSessionResponseSchema,
  deliveryAddressInputSchema,
  deliveryAddressResponseSchema,
  deliveryWindowSelectionRequestSchema,
  deliveryWindowsResponseSchema,
  deliveryEventRequestSchema,
  deliveryEventResponseSchema,
  deliverymanAssignmentsResponseSchema,
  deliverymanEventsResponseSchema,
  deliveryTrackingResponseSchema,
  deliveryMediaListResponseSchema,
  orderCreateRequestSchema,
  orderResponseSchema,
  plansListResponseSchema,
  subscriptionActionRequestSchema,
  subscriptionCreateRequestSchema,
  subscriptionResponseSchema,
  type CartResponse,
  type CartUpdateRequest,
  type CatalogListResponse,
  type CurrentSessionResponse,
  type DeliveryAddressInput,
  type DeliveryAddressResponse,
  type DeliveryWindowSelectionRequest,
  type DeliveryWindowsResponse,
  type DeliveryEventRequest,
  type DeliverymanAssignmentsResponse,
  type DeliveryTrackingResponse,
  type DeliveryMediaListResponse,
  type OrderCreateRequest,
  type OrderResponse,
  type PlansListResponse,
  type SubscriptionActionRequest,
  type SubscriptionCreateRequest,
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
    createSubscription(
      input: SubscriptionCreateRequest,
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<SubscriptionResponse> {
      const payload = subscriptionCreateRequestSchema.parse(input);
      const headers = new Headers(init?.headers);
      headers.set("content-type", "application/json");
      headers.set("idempotency-key", idempotencyKey);
      return getJson(transport, "/api/v1/subscription", subscriptionResponseSchema, {
        ...init,
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    },
    getCart(init?: RequestInit): Promise<CartResponse> {
      return getJson(transport, "/api/v1/cart", cartResponseSchema, init);
    },
    getDeliveryAddress(init?: RequestInit): Promise<DeliveryAddressResponse> {
      return getJson(transport, "/api/v1/delivery-address", deliveryAddressResponseSchema, init);
    },
    updateDeliveryAddress(
      input: DeliveryAddressInput,
      init?: RequestInit,
    ): Promise<DeliveryAddressResponse> {
      const payload = deliveryAddressInputSchema.parse(input);
      const headers = new Headers(init?.headers);
      headers.set("content-type", "application/json");
      return getJson(transport, "/api/v1/delivery-address", deliveryAddressResponseSchema, {
        ...init,
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
    },
    getDeliveryWindows(init?: RequestInit): Promise<DeliveryWindowsResponse> {
      return getJson(transport, "/api/v1/delivery-windows", deliveryWindowsResponseSchema, init);
    },
    selectDeliveryWindow(
      input: DeliveryWindowSelectionRequest,
      init?: RequestInit,
    ): Promise<DeliveryWindowsResponse> {
      const payload = deliveryWindowSelectionRequestSchema.parse(input);
      const headers = new Headers(init?.headers);
      headers.set("content-type", "application/json");
      return getJson(transport, "/api/v1/delivery-windows", deliveryWindowsResponseSchema, {
        ...init,
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
    },
    getDeliverymanAssignments(init?: RequestInit): Promise<DeliverymanAssignmentsResponse> {
      return getJson(
        transport,
        "/api/v1/deliveryman/assignments",
        deliverymanAssignmentsResponseSchema,
        init,
      );
    },
    getDeliverymanEvents(assignmentId: string, init?: RequestInit) {
      return getJson(
        transport,
        `/api/v1/deliveryman/assignments/${encodeURIComponent(assignmentId)}/events`,
        deliverymanEventsResponseSchema,
        init,
      );
    },
    submitDeliveryEvent(input: DeliveryEventRequest, init?: RequestInit) {
      const payload = deliveryEventRequestSchema.parse(input);
      const headers = new Headers(init?.headers);
      headers.set("content-type", "application/json");
      return getJson(transport, "/api/v1/deliveryman/events", deliveryEventResponseSchema, {
        ...init,
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    },
    getOrderTracking(orderId: string, init?: RequestInit): Promise<DeliveryTrackingResponse> {
      return getJson(
        transport,
        `/api/v1/orders/${encodeURIComponent(orderId)}/tracking`,
        deliveryTrackingResponseSchema,
        init,
      );
    },
    getOrderMedia(orderId: string, init?: RequestInit): Promise<DeliveryMediaListResponse> {
      return getJson(
        transport,
        `/api/v1/orders/${encodeURIComponent(orderId)}/media`,
        deliveryMediaListResponseSchema,
        init,
      );
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
