import { cookies } from "next/headers";

import type { CartResponse, CatalogListResponse } from "@carbon/contracts";

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

export async function loadCustomerCatalog(): Promise<CustomerCatalogData> {
  const cookieHeader = (await cookies()).toString();
  return resolveCustomerCatalog(createRuntimeApiTransport(), cookieHeader);
}

export async function resolveCustomerCatalog(
  transport: ApiTransport,
  cookieHeader: string,
): Promise<CustomerCatalogData> {
  const client = createApiClient(transport);
  const init: RequestInit = { headers: { cookie: cookieHeader } };

  try {
    const [catalog, cart] = await Promise.all([client.listCatalog(100), client.getCart(init)]);
    return { catalog: catalog.data, cart: cart.data, error: null };
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
