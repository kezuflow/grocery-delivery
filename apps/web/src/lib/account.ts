import { cookies } from "next/headers";

import type {
  CartResponse,
  CatalogListResponse,
  DeliveryMediaListResponse,
  DeliveryTrackingResponse,
  DeliveryAddressResponse,
  DeliveryWindowsResponse,
  PlansListResponse,
  OrderListResponse,
  PaymentHistoryResponse,
  SubscriptionResponse,
  SupportCasesResponse,
  NotificationPreferencesResponse,
  CustomerOrderRequestsResponse,
  CustomerOrderSubstitutionsResponse,
} from "@carbon/contracts";

import { ApiClientError, createApiClient, type ApiTransport } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type CustomerAccountData = Readonly<{
  subscription: SubscriptionResponse["data"] | null;
  deliveryAddress: DeliveryAddressResponse["data"];
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
  catalog: CatalogListResponse["data"];
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
      deliveryWindows,
      plans,
      catalog,
      paymentHistory,
      orderData,
      supportCases,
      notificationPreferences,
      orderRequests,
      orderSubstitutions,
    ] = await Promise.all([
      client.getCurrentSubscription(init).catch((error: unknown) => {
        if (error instanceof ApiClientError && error.status === 404) return null;
        throw error;
      }),
      client.getCart(init),
      client.getDeliveryAddress(init),
      client.getDeliveryWindows(init),
      client.listPlans(),
      client.listCatalog(100),
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
    ]);
    return {
      subscription: subscription?.data ?? null,
      deliveryAddress: deliveryAddress.data,
      deliveryWindows: deliveryWindows.data,
      cart: cart.data,
      plans: plans.data.plans,
      catalog: catalog.data,
      paymentHistory: paymentHistory.data.entries,
      orderHistory: orderData.orders,
      orderFulfillment: orderData.fulfillment,
      supportCases: supportCases.data.cases,
      orderRequests: orderRequests.data.requests,
      orderSubstitutions: orderSubstitutions.data.substitutions,
      notificationPreferences: notificationPreferences.data,
      error: null,
    };
  } catch {
    return {
      subscription: null,
      deliveryAddress: null,
      deliveryWindows: { cycleId: "", windows: [], selectedWindowId: null },
      cart: emptyCart,
      plans: [],
      catalog: { categories: [], items: [], nextCursor: null },
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
