import { cookies } from "next/headers";

import type {
  DispatchResponse,
  OperationalProjectionResponse,
  ProcurementResponse,
  PromotionAdminListResponse,
  AdminAuditResponse,
  SupportCasesResponse,
} from "@carbon/contracts";

import { createApiClient } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type AdminDashboardData = Readonly<{
  projection: OperationalProjectionResponse["data"] | null;
  procurement: ProcurementResponse["data"] | null;
  dispatch: DispatchResponse["data"] | null;
  promotions: PromotionAdminListResponse["data"]["promotions"];
  auditEvents: AdminAuditResponse["data"]["events"];
  supportCases: SupportCasesResponse["data"]["cases"];
  error: string | null;
}>;

export async function loadAdminDashboard(
  permissions: readonly string[],
): Promise<AdminDashboardData> {
  const cookieHeader = (await cookies()).toString();
  const client = createApiClient(createRuntimeApiTransport());
  const init: RequestInit = { headers: { cookie: cookieHeader } };
  try {
    const [projection, procurement, dispatch, promotions, audit, supportCases] = await Promise.all([
      permissions.includes("reporting") ? client.getAdminProjection(init) : null,
      permissions.includes("procurement") ? client.getAdminProcurement(init) : null,
      permissions.includes("dispatch") ? client.getAdminDispatch(init) : null,
      permissions.includes("marketing") ? client.listAdminPromotions(init) : null,
      permissions.includes("reporting") ? client.getAdminAudit(init) : null,
      permissions.includes("support") ? client.listAdminSupportCases(init) : null,
    ]);
    return {
      projection: projection?.data ?? null,
      procurement: procurement?.data ?? null,
      dispatch: dispatch?.data ?? null,
      promotions: promotions?.data.promotions ?? [],
      auditEvents: audit?.data.events ?? [],
      supportCases: supportCases?.data.cases ?? [],
      error: null,
    };
  } catch {
    return {
      projection: null,
      procurement: null,
      dispatch: null,
      promotions: [],
      auditEvents: [],
      supportCases: [],
      error: "The operations dashboard is temporarily unavailable.",
    };
  }
}
