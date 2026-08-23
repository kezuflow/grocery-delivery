import { cookies } from "next/headers";

import type {
  CartResponse,
  DeliveryMediaListResponse,
  DeliveryTrackingResponse,
  DeliveryAddressResponse,
  DeliveryAddressesResponse,
  DeliveryWindowsResponse,
  PlansListResponse,
  OrderListResponse,
  PaymentHistoryResponse,
  SubscriptionResponse,
  SupportCasesResponse,
  NotificationPreferencesResponse,
  CustomerOrderRequestsResponse,
  CustomerOrderSubstitutionsResponse,
  AccountExportResponse,
} from "@carbon/contracts";

import { ApiClientError, createApiClient, type ApiTransport } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type CustomerAccountData = Readonly<{
  subscription: SubscriptionResponse["data"] | null;
  deliveryAddress: DeliveryAddressResponse["data"];
  deliveryAddresses: DeliveryAddressesResponse["data"]["addresses"];
  deliveryWindows: DeliveryWindowsResponse["data"];
  cart: CartResponse["data"];
  plans: PlansListResponse["data"]["plans"];
  paymentHistory: PaymentHistoryResponse["data"]["entries"];
  orderHistory: OrderListResponse["data"]["orders"];
  orderFulfillment: readonly CustomerOrderFulfillment[];
  supportCases: SupportCasesResponse["data"]["cases"];
  orderRequests: CustomerOrderRequestsResponse["data"]["requests"];
  orderSubstitutions: CustomerOrderSubstitutionsResponse["data"]["substitutions"];
  notificationPreferences: NotificationPreferencesResponse["data"];
  privacy: Readonly<{
    export: AccountExportResponse["data"] | null;
    deletionEligible: boolean;
    deletionReasons: readonly string[];
  }>;
  error: string | null;
}>;

export type CustomerOrderFulfillment = Readonly<{
  orderId: string;
  tracking: DeliveryTrackingResponse["data"] | null;
  media: DeliveryMediaListResponse["data"]["media"];
}>;

const emptyCart: CartResponse["data"] = {
  lines: [],
  subtotal: { centavos: 0, currency: "PHP" },
  updatedAt: null,
};

export async function loadCustomerAccount(): Promise<CustomerAccountData> {
  const cookieHeader = (await cookies()).toString();
  return resolveCustomerAccount(createRuntimeApiTransport(), cookieHeader);
}

export async function resolveCustomerAccount(
  transport: ApiTransport,
  cookieHeader: string,
): Promise<CustomerAccountData> {
  const client = createApiClient(transport);
  const init: RequestInit = { headers: { cookie: cookieHeader } };

  try {
    const [
      subscription,
      cart,
      deliveryAddress,
      deliveryAddresses,
      deliveryWindows,
      plans,
      paymentHistory,
      orderData,
      supportCases,
      notificationPreferences,
      orderRequests,
      orderSubstitutions,
      accountExport,
      deletionEligibility,
    ] = await Promise.all([
      client.getCurrentSubscription(init).catch((error: unknown) => {
        if (error instanceof ApiClientError && error.status === 404) return null;
        throw error;
      }),
      client.getCart(init),
      client.getDeliveryAddress(init),
      client.getDeliveryAddresses(init).catch(() => ({ data: { addresses: [] } })),
      client.getDeliveryWindows(init),
      client.listPlans(init),
      client.getPaymentHistory(init).catch(() => ({ data: { entries: [] } })),
      loadOrderData(client, init),
      client.getSupportCases(init).catch(() => ({ data: { cases: [] } })),
      client.getNotificationPreferences(init).catch(() => ({
        data: {
          customerId: "",
          deliveryUpdates: true,
          marketing: false,
          updatedAt: new Date(0).toISOString(),
        },
      })),
      client.getOrderRequests(init).catch(() => ({ data: { requests: [] } })),
      client.getOrderSubstitutions(init).catch(() => ({ data: { substitutions: [] } })),
      client.exportAccount(init).catch(() => null),
      client.getAccountDeletionEligibility(init).catch(() => null),
    ]);
    return {
      subscription: subscription?.data ?? null,
      deliveryAddress: deliveryAddress.data,
      deliveryAddresses: deliveryAddresses.data.addresses,
      deliveryWindows: deliveryWindows.data,
      cart: cart?.data ?? emptyCart,
      plans: plans.data.plans,
      paymentHistory: paymentHistory.data.entries,
      orderHistory: orderData.orders,
      orderFulfillment: orderData.fulfillment,
      supportCases: supportCases.data.cases,
      orderRequests: orderRequests.data.requests,
      orderSubstitutions: orderSubstitutions.data.substitutions,
      notificationPreferences: notificationPreferences.data,
      privacy: {
        export: accountExport?.data ?? null,
        deletionEligible: deletionEligibility?.data.eligible ?? false,
        deletionReasons: deletionEligibility?.data.reasons ?? ["ELIGIBILITY_UNAVAILABLE"],
      },
      error: null,
    };
  } catch {
    return {
      subscription: null,
      deliveryAddress: null,
      deliveryAddresses: [],
      deliveryWindows: {
        cycleId: "",
        cutoffAt: new Date(0).toISOString(),
        windows: [],
        selectedWindowId: null,
      },
      cart: emptyCart,
      plans: [],
      paymentHistory: [],
      orderHistory: [],
      orderFulfillment: [],
      supportCases: [],
      orderRequests: [],
      orderSubstitutions: [],
      notificationPreferences: {
        customerId: "",
        deliveryUpdates: true,
        marketing: false,
        updatedAt: new Date(0).toISOString(),
      },
      privacy: {
        export: null,
        deletionEligible: false,
        deletionReasons: ["ELIGIBILITY_UNAVAILABLE"],
      },
      error: "We could not load your account right now. Please try again shortly.",
    };
  }
}

async function loadOrderData(client: ReturnType<typeof createApiClient>, init: RequestInit) {
  try {
    const response = await client.getOrderHistory(init);
    const fulfillment = await Promise.all(
      response.data.orders.map(async (order) => {
        const [tracking, media] = await Promise.all([
          client.getOrderTracking(order.id, init).catch(() => null),
          client.getOrderMedia(order.id, init).catch(() => ({ data: { media: [] } })),
        ]);
        return {
          orderId: order.id,
          tracking: tracking?.data ?? null,
          media: media.data.media,
        } satisfies CustomerOrderFulfillment;
      }),
    );
    return { orders: response.data.orders, fulfillment };
  } catch {
    return { orders: [], fulfillment: [] };
  }
}
