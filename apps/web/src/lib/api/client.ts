import {
  apiErrorResponseSchema,
  catalogListResponseSchema,
  plansListResponseSchema,
  type CatalogListResponse,
  type PlansListResponse,
} from "@carbon/contracts";

export type ApiTransport = Readonly<{
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}>;

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export function createApiClient(transport: ApiTransport) {
  return {
    listPlans(): Promise<PlansListResponse> {
      return getJson(transport, "/api/v1/plans", plansListResponseSchema);
    },
    listCatalog(limit = 12): Promise<CatalogListResponse> {
      return getJson(transport, `/api/v1/catalog?limit=${limit}`, catalogListResponseSchema);
    },
  };
}

async function getJson<T>(
  transport: ApiTransport,
  path: string,
  schema: { parse(value: unknown): T },
): Promise<T> {
  const response = await transport.fetch(new URL(path, "https://carbon-api.internal"));
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = apiErrorResponseSchema.safeParse(payload);
    throw new ApiClientError(
      response.status,
      error.success ? error.data.error.code : "API_REQUEST_FAILED",
      error.success ? error.data.error.message : "The API request failed",
    );
  }

  return schema.parse(payload);
}
