import { cookies } from "next/headers";

import type {
  DispatchResponse,
  OperationalProjectionResponse,
  ProcurementResponse,
  PromotionAdminListResponse,
  AdminAuditResponse,
  SupportCasesResponse,
  AdminOrderRequestsResponse,
} from "@carbon/contracts";

import { createApiClient } from "./api/client";
import { ApiClientError } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type AdminFeedStatus = "not_requested" | "ready" | "empty" | "forbidden" | "unavailable";

export type AdminFeedState = Readonly<{
  status: AdminFeedStatus;
  message: string | null;
  correlationId: string | null;
}>;

export type AdminDashboardFeedKey =
  | "projection"
  | "procurement"
  | "dispatch"
  | "promotions"
  | "audit"
  | "supportCases"
  | "orderRequests";

export type AdminDashboardData = Readonly<{
  projection: OperationalProjectionResponse["data"] | null;
  procurement: ProcurementResponse["data"] | null;
  dispatch: DispatchResponse["data"] | null;
  promotions: PromotionAdminListResponse["data"]["promotions"];
  auditEvents: AdminAuditResponse["data"]["events"];
  supportCases: SupportCasesResponse["data"]["cases"];
  orderRequests: AdminOrderRequestsResponse["data"]["requests"];
  states: Readonly<Record<AdminDashboardFeedKey, AdminFeedState>>;
  error: string | null;
}>;

export async function loadAdminDashboard(
  permissions: readonly string[],
): Promise<AdminDashboardData> {
  const cookieHeader = (await cookies()).toString();
  const client = createApiClient(createRuntimeApiTransport());
  const init: RequestInit = { headers: { cookie: cookieHeader } };
  const [projection, procurement, dispatch, promotions, audit, supportCases, orderRequests] =
    await Promise.all([
      loadFeed(permissions.includes("reporting"), () => client.getAdminProjection(init)),
      loadFeed(
        permissions.includes("procurement"),
        () => client.getAdminProcurement(init),
        (data) =>
          data.demand.length === 0 && data.shortages.length === 0 && data.manifests.length === 0,
      ),
      loadFeed(
        permissions.includes("dispatch"),
        () => client.getAdminDispatch(init),
        (data) => data.assignments.length === 0,
      ),
      loadFeed(
        permissions.includes("marketing"),
        () => client.listAdminPromotions(init),
        (data) => data.promotions.length === 0,
      ),
      loadFeed(
        permissions.includes("reporting"),
        () => client.getAdminAudit(init),
        (data) => data.events.length === 0,
      ),
      loadFeed(
        permissions.includes("support"),
        () => client.listAdminSupportCases(init),
        (data) => data.cases.length === 0,
      ),
      loadFeed(
        permissions.some((permission) => ["finance", "support", "dispatch"].includes(permission)),
        () => client.getAdminOrderRequests(init),
        (data) => data.requests.length === 0,
      ),
    ]);
  const states = {
    projection: projection.state,
    procurement: procurement.state,
    dispatch: dispatch.state,
    promotions: promotions.state,
    audit: audit.state,
    supportCases: supportCases.state,
    orderRequests: orderRequests.state,
  } satisfies Record<AdminDashboardFeedKey, AdminFeedState>;
  const firstError = Object.values(states).find((state) => state.message)?.message ?? null;
  return {
    projection: projection.data,
    procurement: procurement.data,
    dispatch: dispatch.data,
    promotions: promotions.data?.promotions ?? [],
    auditEvents: audit.data?.events ?? [],
    supportCases: supportCases.data?.cases ?? [],
    orderRequests: orderRequests.data?.requests ?? [],
    states,
    error: firstError,
  };
}

export function classifyAdminFeedError(error: unknown): AdminFeedState {
  const apiError = error instanceof ApiClientError ? error : null;
  const forbidden = apiError?.status === 401 || apiError?.status === 403;
  return {
    status: forbidden ? "forbidden" : "unavailable",
    message: apiError?.message ?? "This server feed is temporarily unavailable.",
    correlationId: apiError?.correlationId ?? null,
  };
}

async function loadFeed<T>(
  requested: boolean,
  request: () => Promise<{ data: T }>,
  isEmpty?: (data: T) => boolean,
): Promise<{ data: T | null; state: AdminFeedState }> {
  if (!requested) {
    return {
      data: null,
      state: { status: "not_requested", message: null, correlationId: null },
    };
  }
  try {
    const response = await request();
    return {
      data: response.data,
      state: {
        status: isEmpty?.(response.data) ? "empty" : "ready",
        message: null,
        correlationId: null,
      },
    };
  } catch (error) {
    return { data: null, state: classifyAdminFeedError(error) };
  }
}
