import type { CatalogListResponse, PlansListResponse } from "@carbon/contracts";

import { createApiClient, type ApiClientError } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type StorefrontData = Readonly<{
  plans: PlansListResponse["data"]["plans"];
  catalog: CatalogListResponse["data"];
  error: string | null;
}>;

export async function loadStorefront(): Promise<StorefrontData> {
  try {
    const client = createApiClient(createRuntimeApiTransport());
    const [plans, catalog] = await Promise.all([client.listPlans(), client.listCatalog()]);
    return { plans: plans.data.plans, catalog: catalog.data, error: null };
  } catch (error) {
    return {
      plans: [],
      catalog: { categories: [], items: [], nextCursor: null },
      error: toStorefrontError(error),
    };
  }
}

function toStorefrontError(error: unknown) {
  if (isApiClientError(error) && error.status >= 500) {
    return "We are updating the storefront. Please try again shortly.";
  }
  return "We could not load the latest plans and catalog. Please try again shortly.";
}

function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof Error && error.name === "ApiClientError";
}
