import { cookies } from "next/headers";

import type {
  DispatchResponse,
  OperationalProjectionResponse,
  ProcurementResponse,
  PromotionAdminListResponse,
} from "@carbon/contracts";

import { createApiClient } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type AdminDashboardData = Readonly<{
  projection: OperationalProjectionResponse["data"] | null;
  procurement: ProcurementResponse["data"] | null;
  dispatch: DispatchResponse["data"] | null;
  promotions: PromotionAdminListResponse["data"]["promotions"];
  error: string | null;
}>;

export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const cookieHeader = (await cookies()).toString();
  const client = createApiClient(createRuntimeApiTransport());
  const init: RequestInit = { headers: { cookie: cookieHeader } };
  try {
    const [projection, procurement, dispatch, promotions] = await Promise.all([
      client.getAdminProjection(init),
      client.getAdminProcurement(init),
      client.getAdminDispatch(init),
      client.listAdminPromotions(init),
    ]);
    return {
      projection: projection.data,
      procurement: procurement.data,
      dispatch: dispatch.data,
      promotions: promotions.data.promotions,
      error: null,
    };
  } catch {
    return {
      projection: null,
      procurement: null,
      dispatch: null,
      promotions: [],
      error: "The operations dashboard is temporarily unavailable.",
    };
  }
}
