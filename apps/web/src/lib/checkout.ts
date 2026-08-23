import { cookies } from "next/headers";

import type {
  CartResponse,
  CheckoutQuoteResponse,
  DeliveryAddressResponse,
  DeliveryAddressesResponse,
  DeliveryWindowsResponse,
  PaymentMethodListResponse,
  SubscriptionResponse,
} from "@carbon/contracts";

import { ApiClientError, createApiClient, type ApiTransport } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type CheckoutData = Readonly<{
  subscription: SubscriptionResponse["data"] | null;
  cart: CartResponse["data"];
  deliveryAddress: DeliveryAddressResponse["data"];
  deliveryAddresses: DeliveryAddressesResponse["data"]["addresses"];
  deliveryWindows: DeliveryWindowsResponse["data"];
  paymentMethods: PaymentMethodListResponse["data"]["methods"];
  quote: CheckoutQuoteResponse["data"] | null;
  error: string | null;
}>;

export async function loadCheckoutData(): Promise<CheckoutData> {
  const cookieHeader = (await cookies()).toString();
  return resolveCheckoutData(createRuntimeApiTransport(), cookieHeader);
}

export async function resolveCheckoutData(
  transport: ApiTransport,
  cookieHeader: string,
): Promise<CheckoutData> {
  const client = createApiClient(transport);
  const init = { headers: { cookie: cookieHeader } };
  const [
    subscription,
    cart,
    deliveryAddress,
    deliveryAddresses,
    deliveryWindows,
    paymentMethods,
    quote,
  ] = await Promise.all([
    client.getCurrentSubscription(init).catch((error: unknown) => {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw error;
    }),
    client.getCart(init),
    client.getDeliveryAddress(init).catch(() => ({ data: null })),
    client.getDeliveryAddresses(init).catch(() => ({ data: { addresses: [] } })),
    client.getDeliveryWindows(init),
    client.getPaymentMethods(init).catch(() => null),
    client.getCheckoutQuote(init).catch(() => null),
  ]);

  return {
    subscription: subscription?.data ?? null,
    cart: cart.data,
    deliveryAddress: deliveryAddress.data,
    deliveryAddresses: deliveryAddresses.data.addresses,
    deliveryWindows: deliveryWindows.data,
    paymentMethods: paymentMethods?.data.methods ?? [],
    quote: quote?.data ?? null,
    error: paymentMethods
      ? null
      : "Payment methods are temporarily unavailable. You can still review your order.",
  };
}
