import {
  apiErrorResponseSchema,
  cartResponseSchema,
  cartUpdateRequestSchema,
  catalogListResponseSchema,
  currentSessionResponseSchema,
  deliveryAddressInputSchema,
  deliveryAddressResponseSchema,
  deliveryAddressesResponseSchema,
  savedDeliveryAddressResponseSchema,
  deliveryWindowSelectionRequestSchema,
  deliveryWindowsResponseSchema,
  deliveryEventRequestSchema,
  deliveryEventResponseSchema,
  deliverymanAssignmentsResponseSchema,
  deliverymanEventsResponseSchema,
  deliveryTrackingResponseSchema,
  deliveryMediaListResponseSchema,
  deliveryMediaUploadResponseSchema,
  accountExportResponseSchema,
  accountDeletionEligibilityResponseSchema,
  accountDeletionRequestResponseSchema,
  accountConsentRequestSchema,
  accountConsentResponseSchema,
  orderCreateRequestSchema,
  orderListResponseSchema,
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
  notificationPreferencesRequestSchema,
  notificationPreferencesResponseSchema,
  customerOrderRequestCreateSchema,
  customerOrderRequestResponseSchema,
  customerOrderRequestsResponseSchema,
  adminOrderRequestDecisionSchema,
  adminRoleAssignmentRequestSchema,
  adminRoleAssignmentResponseSchema,
  adminOrderRequestsResponseSchema,
  customerOrderSubstitutionDecisionSchema,
  customerOrderSubstitutionResponseSchema,
  customerOrderSubstitutionsResponseSchema,
  launchConfigurationApplyRequestSchema,
  launchConfigurationResponseSchema,
  paymentRefundRequestSchema,
  paymentRefundResponseSchema,
  paymentMethodListResponseSchema,
  plansListResponseSchema,
  paymentHistoryResponseSchema,
  subscriptionActionRequestSchema,
  subscriptionCreateRequestSchema,
  subscriptionTrialRequestSchema,
  subscriptionResponseSchema,
  type CartResponse,
  type CartUpdateRequest,
  type CatalogListResponse,
  type CurrentSessionResponse,
  type DeliveryAddressInput,
  type DeliveryAddressResponse,
  type DeliveryAddressesResponse,
  type SavedDeliveryAddressResponse,
  type DeliveryWindowSelectionRequest,
  type DeliveryWindowsResponse,
  type DeliveryEventRequest,
  type DeliverymanAssignmentsResponse,
  type DeliveryTrackingResponse,
  type DeliveryMediaListResponse,
  type DeliveryMediaUploadRequest,
  type DeliveryMediaUploadResponse,
  type AccountExportResponse,
  type AccountDeletionRequestResponse,
  type OrderCreateRequest,
  type OrderListResponse,
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
  type NotificationPreferencesResponse,
  type PaymentRefundResponse,
  type PaymentMethodListResponse,
  type CustomerOrderRequestResponse,
  type CustomerOrderRequestsResponse,
  type AdminOrderRequestsResponse,
  type AdminRoleAssignmentResponse,
  type CustomerOrderSubstitutionResponse,
  type CustomerOrderSubstitutionsResponse,
  type LaunchConfigurationResponse,
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
  readonly correlationId: string | null;

  constructor(status: number, code: string, message: string, correlationId: string | null = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
  }
}

export function createApiClient(baseTransport: ApiTransport) {
  const transport = baseTransport;
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
    exportAccount(init?: RequestInit): Promise<AccountExportResponse> {
      return getJson(transport, "/api/v1/account/export", accountExportResponseSchema, init);
    },
    getAccountDeletionEligibility(init?: RequestInit) {
      return getJson(
        transport,
        "/api/v1/account/deletion-eligibility",
        accountDeletionEligibilityResponseSchema,
        init,
      );
    },
    requestAccountDeletion(
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<AccountDeletionRequestResponse> {
      const headers = new Headers(init?.headers);
      headers.set("idempotency-key", idempotencyKey);
      return sendJson(
        transport,
        "/api/v1/account/deletion-request",
        {},
        accountDeletionRequestResponseSchema,
        "POST",
        { ...init, headers },
      );
    },
    recordAccountConsent(input: unknown, idempotencyKey: string, init?: RequestInit) {
      const payload = accountConsentRequestSchema.parse(input);
      const headers = new Headers(init?.headers);
      headers.set("idempotency-key", idempotencyKey);
      return sendJson(
        transport,
        "/api/v1/account/consents",
        payload,
        accountConsentResponseSchema,
        "POST",
        { ...init, headers },
      );
    },
    getCurrentSubscription(init?: RequestInit): Promise<SubscriptionResponse> {
      return getJson(transport, "/api/v1/subscription", subscriptionResponseSchema, init);
    },
    getPaymentHistory(init?: RequestInit): Promise<PaymentHistoryResponse> {
      return getJson(transport, "/api/v1/payments/history", paymentHistoryResponseSchema, init);
    },
    getPaymentMethods(init?: RequestInit): Promise<PaymentMethodListResponse> {
      return getJson(transport, "/api/v1/payments/methods", paymentMethodListResponseSchema, init);
    },
    getOrderHistory(init?: RequestInit): Promise<OrderListResponse> {
      return getJson(transport, "/api/v1/orders", orderListResponseSchema, init);
    },
    getOrderRequests(init?: RequestInit): Promise<CustomerOrderRequestsResponse> {
      return getJson(
        transport,
        "/api/v1/order-requests",
        customerOrderRequestsResponseSchema,
        init,
      );
    },
    createOrderRequest(
      input: unknown,
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<CustomerOrderRequestResponse> {
      const payload = customerOrderRequestCreateSchema.parse(input);
      return sendJson(
        transport,
        "/api/v1/order-requests",
        payload,
        customerOrderRequestResponseSchema,
        "POST",
        { ...init, headers: { ...init?.headers, "idempotency-key": idempotencyKey } },
      );
    },
    getOrderSubstitutions(init?: RequestInit): Promise<CustomerOrderSubstitutionsResponse> {
      return getJson(
        transport,
        "/api/v1/order-substitutions",
        customerOrderSubstitutionsResponseSchema,
        init,
      );
    },
    decideOrderSubstitution(
      id: string,
      decision: "accept" | "reject",
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<CustomerOrderSubstitutionResponse> {
      const payload = customerOrderSubstitutionDecisionSchema.parse({ decision });
      return sendJson(
        transport,
        `/api/v1/order-substitutions/${encodeURIComponent(id)}/decision`,
        payload,
        customerOrderSubstitutionResponseSchema,
        "POST",
        { ...init, headers: { ...init?.headers, "idempotency-key": idempotencyKey } },
      );
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
    applyLaunchConfiguration(
      input: unknown,
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<LaunchConfigurationResponse> {
      const payload = launchConfigurationApplyRequestSchema.parse(input);
      const headers = new Headers(init?.headers);
      headers.set("idempotency-key", idempotencyKey);
      return sendJson(
        transport,
        "/api/v1/admin/launch-configuration",
        payload,
        launchConfigurationResponseSchema,
        "PUT",
        { ...init, headers },
      );
    },
    getAdminOrderRequests(init?: RequestInit): Promise<AdminOrderRequestsResponse> {
      return getJson(
        transport,
        "/api/v1/admin/order-requests",
        adminOrderRequestsResponseSchema,
        init,
      );
    },
    assignAdminRole(input: unknown, init?: RequestInit): Promise<AdminRoleAssignmentResponse> {
      const payload = adminRoleAssignmentRequestSchema.parse(input);
      return sendJson(
        transport,
        "/api/v1/admin/identity/roles",
        payload,
        adminRoleAssignmentResponseSchema,
        "POST",
        init,
      );
    },
    decideAdminOrderRequest(
      id: string,
      decision: "approve" | "reject",
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<CustomerOrderRequestResponse> {
      const payload = adminOrderRequestDecisionSchema.parse({ decision });
      return sendJson(
        transport,
        `/api/v1/admin/order-requests/${encodeURIComponent(id)}/decision`,
        payload,
        customerOrderRequestResponseSchema,
        "POST",
        { ...init, headers: { ...init?.headers, "idempotency-key": idempotencyKey } },
      );
    },
    getSupportCases(init?: RequestInit): Promise<SupportCasesResponse> {
      return getJson(transport, "/api/v1/support/cases", supportCasesResponseSchema, init);
    },
    getNotificationPreferences(init?: RequestInit): Promise<NotificationPreferencesResponse> {
      return getJson(
        transport,
        "/api/v1/notification-preferences",
        notificationPreferencesResponseSchema,
        init,
      );
    },
    updateNotificationPreferences(
      input: unknown,
      init?: RequestInit,
    ): Promise<NotificationPreferencesResponse> {
      const payload = notificationPreferencesRequestSchema.parse(input);
      return sendJson(
        transport,
        "/api/v1/notification-preferences",
        payload,
        notificationPreferencesResponseSchema,
        "PUT",
        init,
      );
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
    activateFreeTrial(
      input: SubscriptionCreateRequest,
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<SubscriptionResponse> {
      const payload = subscriptionTrialRequestSchema.parse(input);
      const headers = new Headers(init?.headers);
      headers.set("content-type", "application/json");
      headers.set("idempotency-key", idempotencyKey);
      return getJson(transport, "/api/v1/subscription/trial", subscriptionResponseSchema, {
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
    getDeliveryAddresses(init?: RequestInit): Promise<DeliveryAddressesResponse> {
      return getJson(
        transport,
        "/api/v1/delivery-addresses",
        deliveryAddressesResponseSchema,
        init,
      );
    },
    createDeliveryAddress(
      input: DeliveryAddressInput,
      idempotencyKey: string,
      init?: RequestInit,
    ): Promise<SavedDeliveryAddressResponse> {
      const payload = deliveryAddressInputSchema.parse(input);
      return sendJson(
        transport,
        "/api/v1/delivery-addresses",
        payload,
        savedDeliveryAddressResponseSchema,
        "POST",
        { ...init, headers: { ...init?.headers, "idempotency-key": idempotencyKey } },
      );
    },
    selectDeliveryAddress(id: string, init?: RequestInit): Promise<SavedDeliveryAddressResponse> {
      return sendJson(
        transport,
        `/api/v1/delivery-addresses/${encodeURIComponent(id)}/select`,
        {},
        savedDeliveryAddressResponseSchema,
        "PUT",
        init,
      );
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
    createDeliveryMediaUpload(
      input: DeliveryMediaUploadRequest,
      init?: RequestInit,
    ): Promise<DeliveryMediaUploadResponse> {
      return sendJson(
        transport,
        "/api/v1/deliveryman/media",
        input,
        deliveryMediaUploadResponseSchema,
        "POST",
        init,
      );
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
    getCheckoutQuote(init?: RequestInit): Promise<CheckoutQuoteResponse> {
      return getJson(transport, "/api/v1/checkout/quote", checkoutQuoteResponseSchema, init);
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
