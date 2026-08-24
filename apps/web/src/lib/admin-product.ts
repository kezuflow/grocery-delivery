import { cookies } from "next/headers";

import type {
  AdminAuditResponse,
  AdminOrderRequestsResponse,
  CatalogAdminListResponse,
  DispatchResponse,
  OperationalProjectionResponse,
  ProcurementResponse,
  SupportCasesResponse,
} from "@carbon/contracts";

import { createApiClient } from "./api/client";
import { ApiClientError } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";
import type { AdminFeedState } from "./admin";

type AdminRequestInit = Readonly<{ headers: { cookie: string } }>;

export type AdminCatalogData = Readonly<{
  catalog: CatalogAdminListResponse["data"] | null;
  state: AdminFeedState;
  error: string | null;
}>;

export type AdminOrdersData = Readonly<{
  projection: OperationalProjectionResponse["data"] | null;
  procurement: ProcurementResponse["data"] | null;
  dispatch: DispatchResponse["data"] | null;
  supportCases: SupportCasesResponse["data"]["cases"];
  orderRequests: AdminOrderRequestsResponse["data"]["requests"];
  states: Readonly<{
    projection: AdminFeedState;
    procurement: AdminFeedState;
    dispatch: AdminFeedState;
    supportCases: AdminFeedState;
    orderRequests: AdminFeedState;
  }>;
  error: string | null;
}>;

export type AdminStaffData = Readonly<{
  auditEvents: AdminAuditResponse["data"]["events"];
  state: AdminFeedState;
  error: string | null;
}>;

export async function loadAdminCatalog(): Promise<AdminCatalogData> {
  try {
    const client = createApiClient(createRuntimeApiTransport());
    const response = await client.listAdminCatalog({
      headers: { cookie: (await cookies()).toString() },
    });
    return {
      catalog: response.data,
      state: {
        status: response.data.items.length === 0 ? "empty" : "ready",
        message: null,
        correlationId: null,
      },
      error: null,
    };
  } catch (error) {
    return {
      catalog: null,
      state: classifyAdminFeedError(error),
      error: "The server catalog is temporarily unavailable.",
    };
  }
}

export async function loadAdminOrders(permissions: readonly string[]): Promise<AdminOrdersData> {
  const client = createApiClient(createRuntimeApiTransport());
  const init = await getRequestInit();
  const [projection, procurement, dispatch, supportCases, orderRequests] = await Promise.all([
    loadFeed(permissions.includes("reporting"), () => client.getAdminProjection(init)),
    loadFeed(permissions.includes("procurement"), () => client.getAdminProcurement(init)),
    loadFeed(permissions.includes("dispatch"), () => client.getAdminDispatch(init)),
    loadFeed(permissions.includes("support"), () => client.listAdminSupportCases(init)),
    loadFeed(
      permissions.some((permission) => ["finance", "support", "dispatch"].includes(permission)),
      () => client.getAdminOrderRequests(init),
    ),
  ]);
  const states = {
    projection: projection.state,
    procurement: procurement.state,
    dispatch: dispatch.state,
    supportCases: supportCases.state,
    orderRequests: orderRequests.state,
  };
  return {
    projection: projection.data,
    procurement: procurement.data,
    dispatch: dispatch.data,
    supportCases: supportCases.data?.cases ?? [],
    orderRequests: orderRequests.data?.requests ?? [],
    states,
    error: Object.values(states).find((state) => state.message)?.message ?? null,
  };
}

export async function loadAdminStaff(): Promise<AdminStaffData> {
  try {
    const client = createApiClient(createRuntimeApiTransport());
    const response = await client.getAdminAudit(await getRequestInit());
    return {
      auditEvents: response.data.events,
      state: {
        status: response.data.events.length === 0 ? "empty" : "ready",
        message: null,
        correlationId: null,
      },
      error: null,
    };
  } catch (error) {
    const state = classifyAdminFeedError(error);
    return { auditEvents: [], state, error: state.message };
  }
}

async function getRequestInit(): Promise<AdminRequestInit> {
  return { headers: { cookie: (await cookies()).toString() } };
}

function classifyAdminFeedError(error: unknown): AdminFeedState {
  const apiError = error instanceof ApiClientError ? error : null;
  return {
    status: apiError?.status === 401 || apiError?.status === 403 ? "forbidden" : "unavailable",
    message: apiError?.message ?? "This server feed is temporarily unavailable.",
    correlationId: apiError?.correlationId ?? null,
  };
}

async function loadFeed<T>(
  requested: boolean,
  request: () => Promise<{ data: T }>,
): Promise<{ data: T | null; state: AdminFeedState }> {
  if (!requested) {
    return { data: null, state: { status: "not_requested", message: null, correlationId: null } };
  }
  try {
    const response = await request();
    return {
      data: response.data,
      state: {
        status: isEmptyValue(response.data) ? "empty" : "ready",
        message: null,
        correlationId: null,
      },
    };
  } catch (error) {
    return { data: null, state: classifyAdminFeedError(error) };
  }
}

function isEmptyValue(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const values = Object.values(value);
  const arrays = values.filter(Array.isArray);
  return arrays.length > 0 && arrays.every((item) => item.length === 0);
}
