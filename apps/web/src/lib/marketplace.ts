import { cookies } from "next/headers";

import type {
  ActivePromotionBannersResponse,
  DeliveryAddressResponse,
  PlansListResponse,
  SubscriptionResponse,
} from "@carbon/contracts";

import { ApiClientError, createApiClient, type ApiTransport } from "./api/client";
import { resolveCustomerCatalog, type CustomerCatalogData } from "./catalog";
import { createRuntimeApiTransport } from "./api/runtime";
import type { CatalogQueryOptions } from "../features/catalog/catalog-utils";

export type MarketplaceData = CustomerCatalogData &
  Readonly<{
    deliveryAddress: DeliveryAddressResponse["data"];
    subscription: SubscriptionResponse["data"] | null;
    plans: PlansListResponse["data"]["plans"];
    banners: ActivePromotionBannersResponse["data"]["banners"];
  }>;

export async function loadMarketplace(
  options: Partial<CatalogQueryOptions> = {},
): Promise<MarketplaceData> {
  const cookieHeader = (await cookies()).toString();
  return resolveMarketplace(createRuntimeApiTransport(), cookieHeader, options);
}

export async function resolveMarketplace(
  transport: ApiTransport,
  cookieHeader: string,
  options: Partial<CatalogQueryOptions> = {},
): Promise<MarketplaceData> {
  const client = createApiClient(transport);
  const init = { headers: { cookie: cookieHeader } };
  const [catalog, subscription, plans, banners, deliveryAddress] = await Promise.all([
    resolveCustomerCatalog(transport, cookieHeader, options),
    client.getCurrentSubscription(init).catch((error: unknown) => {
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 404)) {
        return null;
      }
      throw error;
    }),
    client.listPlans(),
    client.getActivePromotionBanners("storefront-strip"),
    client.getDeliveryAddress(init).catch(() => ({ data: null }) as DeliveryAddressResponse),
  ]);
  return {
    ...catalog,
    deliveryAddress: deliveryAddress.data,
    subscription: subscription?.data ?? null,
    plans: plans.data.plans,
    banners: banners.data.banners,
  };
}
