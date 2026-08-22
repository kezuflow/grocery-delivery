import { cookies } from "next/headers";

import type { CartResponse, CatalogListResponse } from "@carbon/contracts";
import type { CatalogQueryOptions } from "../features/catalog/catalog-utils";

import { ApiClientError, createApiClient, type ApiTransport } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

const emptyCart: CartResponse["data"] = {
  lines: [],
  subtotal: { centavos: 0, currency: "PHP" },
  updatedAt: null,
};

export type CustomerCatalogData = Readonly<{
  catalog: CatalogListResponse["data"];
  cart: CartResponse["data"];
  error: string | null;
}>;

export async function loadCustomerCatalog(
  options: Partial<CatalogQueryOptions> = {},
): Promise<CustomerCatalogData> {
  const cookieHeader = (await cookies()).toString();
  return resolveCustomerCatalog(createRuntimeApiTransport(), cookieHeader, options);
}

export async function resolveCustomerCatalog(
  transport: ApiTransport,
  cookieHeader: string,
  options: Partial<CatalogQueryOptions> = {},
): Promise<CustomerCatalogData> {
  const client = createApiClient(transport);
  const init: RequestInit = { headers: { cookie: cookieHeader } };

  try {
    const catalog = await client.listCatalog({
      limit: 20,
      ...(options.cursor ? { cursor: options.cursor } : {}),
      ...(options.search ? { search: options.search } : {}),
      ...(options.category ? { category: options.category } : {}),
      ...(options.sort ? { sort: options.sort } : {}),
      ...(options.minPriceCentavos !== undefined
        ? { minPriceCentavos: options.minPriceCentavos }
        : {}),
      ...(options.maxPriceCentavos !== undefined
        ? { maxPriceCentavos: options.maxPriceCentavos }
        : {}),
    });
    let cart = emptyCart;
    try {
      cart = (await client.getCart(init)).data;
    } catch (error) {
      if (!(error instanceof ApiClientError && error.status === 401)) throw error;
    }
    return { catalog: catalog.data, cart, error: null };
  } catch (error) {
    return {
      catalog: { categories: [], items: [], nextCursor: null },
      cart: emptyCart,
      error:
        error instanceof ApiClientError
          ? error.message
          : "We could not load the catalog right now. Please try again shortly.",
    };
  }
}
