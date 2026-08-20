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
  couponRequestSchema,
  checkoutQuoteResponseSchema,
  dispatchResponseSchema,
  operationalProjectionResponseSchema,
  procurementResponseSchema,
  promotionAdminListResponseSchema,
  promotionAdminResponseSchema,
  promotionAdminUpsertRequestSchema,
  promotionStatusRequestSchema,
  packingManifestRequestSchema,
  procurementPurchaseRequestSchema,
  procurementShortageRequestSchema,
  procurementSubstitutionRequestSchema,
  dispatchAssignmentRequestSchema,
  activePromotionBannersResponseSchema,
  bannerPlacementSchema,
  adminAuditResponseSchema,
  supportCaseCreateRequestSchema,
  supportCaseResponseSchema,
  supportCaseStatusRequestSchema,
  supportCasesResponseSchema,
  paymentRefundRequestSchema,
  paymentRefundResponseSchema,
  plansListResponseSchema,
  paymentHistoryResponseSchema,
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
  type CheckoutQuoteResponse,
  type DispatchResponse,
  type OperationalProjectionResponse,
  type ProcurementResponse,
  type PromotionAdminListResponse,
  type PlansListResponse,
  type PaymentHistoryResponse,
  type SubscriptionActionRequest,
  type SubscriptionCreateRequest,
  type SubscriptionResponse,
  type ActivePromotionBannersResponse,
  type AdminAuditResponse,
  type SupportCaseResponse,
  type SupportCasesResponse,
  type PaymentRefundResponse,
} from "@carbon/contracts";

export type ApiTransport = Readonly<{
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}>;

export type ApiClientOptions = Readonly<{
  sleep?: (milliseconds: number) => Promise<void>;
  maxRateLimitRetries?: number;
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
  readonly correlationId: string | null;

  constructor(status: number, code: string, message: string, correlationId: string | null = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
  }
}

export function createApiClient(baseTransport: ApiTransport, options: ApiClientOptions = {}) {
  const sleep =
    options.sleep ??
    ((milliseconds: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, milliseconds);
      }));
  const maxRateLimitRetries = options.maxRateLimitRetries ?? 1;
  const transport: ApiTransport = {
    fetch: async (input, init) => {
      let attempt = 0;
      while (true) {
        const response = await baseTransport.fetch(input, init);
        if (response.status !== 429 || attempt >= maxRateLimitRetries) return response;
        attempt += 1;
        await sleep(5_000);
      }
    },
  };
  return {
    listPlans(): Promise<PlansListResponse> {
      return getJson(transport, "/api/v1/plans", plansListResponseSchema);
    },
    listCatalog(limit = 12): Promise<CatalogListResponse> {
      return getJson(transport, `/api/v1/catalog?limit=${limit}`, catalogListResponseSchema);
    },
    getActivePromotionBanners(
      placement: "home-hero" | "storefront-strip" | "account-banner",
    ): Promise<ActivePromotionBannersResponse> {
      const value = bannerPlacementSchema.parse(placement);
      return getJson(
        transport,
        `/api/v1/promotions/banners?placement=${encodeURIComponent(value)}`,
        activePromotionBannersResponseSchema,
      );
    },
    getCurrentSession(init?: RequestInit): Promise<CurrentSessionResponse> {
      return getJson(transport, "/api/v1/me", currentSessionResponseSchema, init);
    },
    getCurrentSubscription(init?: RequestInit): Promise<SubscriptionResponse> {
      return getJson(transport, "/api/v1/subscription", subscriptionResponseSchema, init);
    },
    getPaymentHistory(init?: RequestInit): Promise<PaymentHistoryResponse> {
      return getJson(transport, "/api/v1/payments/history", paymentHistoryResponseSchema, init);
    },
    getAdminProjection(init?: RequestInit): Promise<OperationalProjectionResponse> {
      return getJson(
        transport,
        "/api/v1/admin/operations/projection",
        operationalProjectionResponseSchema,
        init,
      );
    },
    getAdminAudit(init?: RequestInit): Promise<AdminAuditResponse> {
      return getJson(transport, "/api/v1/admin/audit?limit=50", adminAuditResponseSchema, init);
    },
    getSupportCases(init?: RequestInit): Promise<SupportCasesResponse> {
      return getJson(transport, "/api/v1/support/cases", supportCasesResponseSchema, init);
    },
    createSupportCase(
      input: unknown,
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<SupportCaseResponse> {
      const payload = supportCaseCreateRequestSchema.parse(input);
      return sendJson(
        transport,
        "/api/v1/support/cases",
        payload,
        supportCaseResponseSchema,
        "POST",
        {
          ...init,
          headers: { ...init?.headers, "idempotency-key": idempotencyKey },
        },
      );
    },
    listAdminSupportCases(init?: RequestInit): Promise<SupportCasesResponse> {
      return getJson(transport, "/api/v1/admin/support/cases", supportCasesResponseSchema, init);
    },
    updateAdminSupportCaseStatus(
      id: string,
      input: unknown,
      init?: RequestInit,
    ): Promise<SupportCaseResponse> {
      const payload = supportCaseStatusRequestSchema.parse(input);
      return sendJson(
        transport,
        `/api/v1/admin/support/cases/${encodeURIComponent(id)}/status`,
        payload,
        supportCaseResponseSchema,
        "PATCH",
        init,
      );
    },
    getAdminProcurement(init?: RequestInit): Promise<ProcurementResponse> {
      return getJson(transport, "/api/v1/admin/procurement", procurementResponseSchema, init);
    },
    getAdminDispatch(init?: RequestInit): Promise<DispatchResponse> {
      return getJson(transport, "/api/v1/admin/dispatch", dispatchResponseSchema, init);
    },
    listAdminPromotions(init?: RequestInit): Promise<PromotionAdminListResponse> {
      return getJson(transport, "/api/v1/admin/promotions", promotionAdminListResponseSchema, init);
    },
    saveAdminPurchase(input: unknown, init?: RequestInit): Promise<ProcurementResponse> {
      const payload = procurementPurchaseRequestSchema.parse(input);
      return sendJson(
        transport,
        "/api/v1/admin/procurement/purchases",
        payload,
        procurementResponseSchema,
        "PUT",
        init,
      );
    },
    createAdminShortage(input: unknown, init?: RequestInit): Promise<ProcurementResponse> {
      const payload = procurementShortageRequestSchema.parse(input);
      return sendJson(
        transport,
        "/api/v1/admin/procurement/shortages",
        payload,
        procurementResponseSchema,
        "POST",
        init,
      );
    },
    createAdminSubstitution(input: unknown, init?: RequestInit): Promise<ProcurementResponse> {
      const payload = procurementSubstitutionRequestSchema.parse(input);
      return sendJson(
        transport,
        "/api/v1/admin/procurement/substitutions",
        payload,
        procurementResponseSchema,
        "POST",
        init,
      );
    },
    savePackingManifest(input: unknown, init?: RequestInit) {
      const payload = packingManifestRequestSchema.parse(input);
      return sendJson(
        transport,
        "/api/v1/admin/packing/manifests",
        payload,
        procurementResponseSchema,
        "POST",
        init,
      );
    },
    assignDispatch(input: unknown, init?: RequestInit): Promise<DispatchResponse> {
      const payload = dispatchAssignmentRequestSchema.parse(input);
      return sendJson(
        transport,
        "/api/v1/admin/dispatch",
        payload,
        dispatchResponseSchema,
        "POST",
        init,
      );
    },
    createAdminPromotion(input: unknown, init?: RequestInit) {
      const payload = promotionAdminUpsertRequestSchema.parse(input);
      return sendJson(
        transport,
        "/api/v1/admin/promotions",
        payload,
        promotionAdminResponseSchema,
        "POST",
        init,
      );
    },
    updateAdminPromotionStatus(id: string, input: unknown, init?: RequestInit) {
      const payload = promotionStatusRequestSchema.parse(input);
      return sendJson(
        transport,
        `/api/v1/admin/promotions/${encodeURIComponent(id)}/status`,
        payload,
        promotionAdminResponseSchema,
        "PATCH",
        init,
      );
    },
    refundPayment(
      input: unknown,
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<PaymentRefundResponse> {
      const payload = paymentRefundRequestSchema.parse(input);
      const headers = new Headers(init?.headers);
      headers.set("idempotency-key", idempotencyKey);
      return sendJson(
        transport,
        "/api/v1/admin/payments/refunds",
        payload,
        paymentRefundResponseSchema,
        "POST",
        { ...init, headers },
      );
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
    previewCoupon(code: string, init?: RequestInit): Promise<CheckoutQuoteResponse> {
      const payload = couponRequestSchema.parse({ code });
      const headers = new Headers(init?.headers);
      headers.set("content-type", "application/json");
      return getJson(transport, "/api/v1/checkout/coupon", checkoutQuoteResponseSchema, {
        ...init,
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    },
    removeCoupon(init?: RequestInit): Promise<CheckoutQuoteResponse> {
      return getJson(transport, "/api/v1/checkout/coupon", checkoutQuoteResponseSchema, {
        ...init,
        method: "DELETE",
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
      error.success ? error.data.meta.correlationId : null,
    );
  }

  return schema.parse(payload);
}

async function sendJson<T>(
  transport: ApiTransport,
  path: string,
  payload: unknown,
  schema: { parse(value: unknown): T },
  method: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json");
  return getJson(transport, path, schema, {
    ...init,
    method,
    headers,
    body: JSON.stringify(payload),
  });
}
