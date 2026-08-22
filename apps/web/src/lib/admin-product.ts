import { cookies } from "next/headers";

import type {
  AdminAuditResponse,
  AdminOrderRequestsResponse,
  CatalogListResponse,
  DispatchResponse,
  OperationalProjectionResponse,
  ProcurementResponse,
  SupportCasesResponse,
} from "@carbon/contracts";

import { createApiClient } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

type AdminRequestInit = Readonly<{ headers: { cookie: string } }>;

export type AdminCatalogData = Readonly<{
  catalog: CatalogListResponse["data"] | null;
  error: string | null;
}>;

export type AdminOrdersData = Readonly<{
  projection: OperationalProjectionResponse["data"] | null;
  procurement: ProcurementResponse["data"] | null;
  dispatch: DispatchResponse["data"] | null;
  supportCases: SupportCasesResponse["data"]["cases"];
  orderRequests: AdminOrderRequestsResponse["data"]["requests"];
  error: string | null;
}>;

export type AdminStaffData = Readonly<{
  auditEvents: AdminAuditResponse["data"]["events"];
  error: string | null;
}>;

export async function loadAdminCatalog(): Promise<AdminCatalogData> {
  try {
    const client = createApiClient(createRuntimeApiTransport());
    const response = await client.listCatalog(100);
    return { catalog: response.data, error: null };
  } catch {
    return { catalog: null, error: "The server catalog is temporarily unavailable." };
  }
}

export async function loadAdminOrders(permissions: readonly string[]): Promise<AdminOrdersData> {
  const client = createApiClient(createRuntimeApiTransport());
  const init = await getRequestInit();
  try {
    const [projection, procurement, dispatch, supportCases, orderRequests] = await Promise.all([
      permissions.includes("reporting") ? client.getAdminProjection(init) : null,
      permissions.includes("procurement") ? client.getAdminProcurement(init) : null,
      permissions.includes("dispatch") ? client.getAdminDispatch(init) : null,
      permissions.includes("support") ? client.listAdminSupportCases(init) : null,
      permissions.some((permission) => ["finance", "support", "dispatch"].includes(permission))
        ? client.getAdminOrderRequests(init)
        : null,
    ]);
    return {
      projection: projection?.data ?? null,
      procurement: procurement?.data ?? null,
      dispatch: dispatch?.data ?? null,
      supportCases: supportCases?.data.cases ?? [],
      orderRequests: orderRequests?.data.requests ?? [],
      error: null,
    };
  } catch {
    return {
      projection: null,
      procurement: null,
      dispatch: null,
      supportCases: [],
      orderRequests: [],
      error: "The operations order feeds are temporarily unavailable.",
    };
  }
}

export async function loadAdminStaff(): Promise<AdminStaffData> {
  try {
    const client = createApiClient(createRuntimeApiTransport());
    const response = await client.getAdminAudit(await getRequestInit());
    return { auditEvents: response.data.events, error: null };
  } catch {
    return { auditEvents: [], error: "The staff audit feed is temporarily unavailable." };
  }
}

async function getRequestInit(): Promise<AdminRequestInit> {
  return { headers: { cookie: (await cookies()).toString() } };
}
