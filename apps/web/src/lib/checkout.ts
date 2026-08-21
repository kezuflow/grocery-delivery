import { cookies } from "next/headers";

import type { CheckoutQuoteResponse, PaymentMethodListResponse } from "@carbon/contracts";

import { createApiClient, type ApiTransport } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";
import { loadCustomerAccount, type CustomerAccountData } from "./account";
import { loadCustomerCatalog, type CustomerCatalogData } from "./catalog";

export type CheckoutData = Readonly<{
  account: CustomerAccountData;
  catalog: CustomerCatalogData;
  paymentMethods: PaymentMethodListResponse["data"]["methods"];
  quote: CheckoutQuoteResponse["data"] | null;
  error: string | null;
}>;

export async function loadCheckoutData(): Promise<CheckoutData> {
  const [account, catalog] = await Promise.all([loadCustomerAccount(), loadCustomerCatalog()]);
  const cookieHeader = (await cookies()).toString();
  return resolveCheckoutData(createRuntimeApiTransport(), cookieHeader, account, catalog);
}

export async function resolveCheckoutData(
  transport: ApiTransport,
  cookieHeader: string,
  account: CustomerAccountData,
  catalog: CustomerCatalogData,
): Promise<CheckoutData> {
  const client = createApiClient(transport);
  const init = { headers: { cookie: cookieHeader } };
  const [paymentMethods, quote] = await Promise.all([
    client.getPaymentMethods(init).catch(() => null),
    client.removeCoupon(init).catch(() => null),
  ]);
  return {
    account,
    catalog,
    paymentMethods: paymentMethods?.data.methods ?? [],
    quote: quote?.data ?? null,
    error: paymentMethods
      ? null
      : "Payment methods are temporarily unavailable. You can still review your order.",
  };
}
