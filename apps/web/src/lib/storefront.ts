import type {
  ActivePromotionBannersResponse,
  CatalogListResponse,
  PlansListResponse,
} from "@carbon/contracts";
import { unstable_cache } from "next/cache";

import { createApiClient, type ApiClientError } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type StorefrontData = Readonly<{
  plans: PlansListResponse["data"]["plans"];
  catalog: CatalogListResponse["data"];
  banners: ActivePromotionBannersResponse["data"]["banners"];
  error: string | null;
}>;

export const loadStorefront = unstable_cache(
  async (): Promise<StorefrontData> => {
    try {
      const client = createApiClient(createRuntimeApiTransport());
      const [plans, catalog, banners] = await Promise.all([
        client.listPlans(),
        client.listCatalog(),
        client.getActivePromotionBanners("home-hero"),
      ]);
      return {
        plans: plans.data.plans,
        catalog: catalog.data,
        banners: banners.data.banners,
        error: null,
      };
    } catch (error) {
      return {
        plans: [],
        catalog: { categories: [], items: [], nextCursor: null },
        banners: [],
        error: toStorefrontError(error),
      };
    }
  },
  ["public-storefront"],
  { revalidate: 60 },
);

function toStorefrontError(error: unknown) {
  if (isApiClientError(error) && error.status >= 500) {
    return "We are updating the storefront. Please try again shortly.";
  }
  return "We could not load the latest plans and catalog. Please try again shortly.";
}

function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof Error && error.name === "ApiClientError";
}
