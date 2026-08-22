import { cookies } from "next/headers";

import type {
  CatalogCategoryResponse,
  CatalogSkuResponse,
  PlanResponse,
  SubscriptionResponse,
} from "@carbon/contracts";

import { ApiClientError, createApiClient } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type CatalogItemData = Readonly<{
  item: CatalogSkuResponse | null;
  categories: readonly CatalogCategoryResponse[];
  plans: readonly PlanResponse["data"][];
  subscription: SubscriptionResponse["data"] | null;
  error: string | null;
}>;

export async function loadCatalogItem(slug: string): Promise<CatalogItemData> {
  const client = createApiClient(createRuntimeApiTransport());
  const cookieHeader = (await cookies()).toString();
  const init: RequestInit = { headers: { cookie: cookieHeader } };

  try {
    const [item, catalog, plans, subscription] = await Promise.all([
      client.getCatalogItem(slug),
      client.listCatalog({ limit: 100 }),
      client.listPlans(),
      client.getCurrentSubscription(init).catch((error: unknown) => {
        if (error instanceof ApiClientError && (error.status === 401 || error.status === 404)) {
          return null;
        }
        throw error;
      }),
    ]);
    return {
      item: item.data,
      categories: catalog.data.categories,
      plans: plans.data.plans,
      subscription: subscription?.data ?? null,
      error: null,
    };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      return { item: null, categories: [], plans: [], subscription: null, error: null };
    }
    return {
      item: null,
      categories: [],
      plans: [],
      subscription: null,
      error: error instanceof ApiClientError ? error.message : "This product is unavailable.",
    };
  }
}
