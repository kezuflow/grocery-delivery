import { cookies } from "next/headers";

import type { PlansListResponse, SubscriptionResponse } from "@carbon/contracts";

import { ApiClientError, createApiClient, type ApiTransport } from "./api/client";
import { resolveCustomerCatalog, type CustomerCatalogData } from "./catalog";
import { createRuntimeApiTransport } from "./api/runtime";

export type MarketplaceData = CustomerCatalogData &
  Readonly<{
    subscription: SubscriptionResponse["data"] | null;
    plans: PlansListResponse["data"]["plans"];
  }>;

export async function loadMarketplace(): Promise<MarketplaceData> {
  const cookieHeader = (await cookies()).toString();
  return resolveMarketplace(createRuntimeApiTransport(), cookieHeader);
}

export async function resolveMarketplace(
  transport: ApiTransport,
  cookieHeader: string,
): Promise<MarketplaceData> {
  const client = createApiClient(transport);
  const init = { headers: { cookie: cookieHeader } };
  const [catalog, subscription, plans] = await Promise.all([
    resolveCustomerCatalog(transport, cookieHeader),
    client.getCurrentSubscription(init).catch((error: unknown) => {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw error;
    }),
    client.listPlans(),
  ]);
  return {
    ...catalog,
    subscription: subscription?.data ?? null,
    plans: plans.data.plans,
  };
}
