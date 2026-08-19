import { cookies } from "next/headers";

import type {
  CartResponse,
  CatalogListResponse,
  DeliveryAddressResponse,
  PlansListResponse,
  SubscriptionResponse,
} from "@carbon/contracts";

import { ApiClientError, createApiClient, type ApiTransport } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type CustomerAccountData = Readonly<{
  subscription: SubscriptionResponse["data"] | null;
  deliveryAddress: DeliveryAddressResponse["data"];
  cart: CartResponse["data"];
  plans: PlansListResponse["data"]["plans"];
  catalog: CatalogListResponse["data"];
  error: string | null;
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
    const [subscription, cart, deliveryAddress, plans, catalog] = await Promise.all([
      client.getCurrentSubscription(init).catch((error: unknown) => {
        if (error instanceof ApiClientError && error.status === 404) return null;
        throw error;
      }),
      client.getCart(init),
      client.getDeliveryAddress(init),
      client.listPlans(),
      client.listCatalog(100),
    ]);
    return {
      subscription: subscription?.data ?? null,
      deliveryAddress: deliveryAddress.data,
      cart: cart.data,
      plans: plans.data.plans,
      catalog: catalog.data,
      error: null,
    };
  } catch {
    return {
      subscription: null,
      deliveryAddress: null,
      cart: emptyCart,
      plans: [],
      catalog: { categories: [], items: [], nextCursor: null },
      error: "We could not load your account right now. Please try again shortly.",
    };
  }
}
