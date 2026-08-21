import { cookies } from "next/headers";

import type {
  DeliveryMediaListResponse,
  DeliveryTrackingResponse,
  OrderListResponse,
} from "@carbon/contracts";

import { createApiClient, type ApiTransport } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type CustomerOrderDetail = Readonly<{
  order: OrderListResponse["data"]["orders"][number];
  tracking: DeliveryTrackingResponse["data"] | null;
  media: DeliveryMediaListResponse["data"]["media"];
}>;

export async function loadCustomerOrders() {
  const cookieHeader = (await cookies()).toString();
  return resolveCustomerOrders(createRuntimeApiTransport(), cookieHeader);
}

export async function resolveCustomerOrders(transport: ApiTransport, cookieHeader: string) {
  const client = createApiClient(transport);
  const init = { headers: { cookie: cookieHeader } };
  const response = await client.getOrderHistory(init);
  return response.data.orders;
}

export async function loadCustomerOrderDetail(
  orderId: string,
): Promise<CustomerOrderDetail | null> {
  const cookieHeader = (await cookies()).toString();
  return resolveCustomerOrderDetail(createRuntimeApiTransport(), cookieHeader, orderId);
}

export async function resolveCustomerOrderDetail(
  transport: ApiTransport,
  cookieHeader: string,
  orderId: string,
): Promise<CustomerOrderDetail | null> {
  const client = createApiClient(transport);
  const init = { headers: { cookie: cookieHeader } };
  const orders = await client.getOrderHistory(init);
  const order = orders.data.orders.find((candidate) => candidate.id === orderId);
  if (!order) return null;
  const [tracking, media] = await Promise.all([
    client.getOrderTracking(orderId, init).catch(() => null),
    client.getOrderMedia(orderId, init).catch(() => ({ data: { media: [] } })),
  ]);
  return { order, tracking: tracking?.data ?? null, media: media.data.media };
}
