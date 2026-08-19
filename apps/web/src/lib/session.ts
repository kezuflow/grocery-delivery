import { cookies } from "next/headers";

import type { CurrentSessionResponse } from "@carbon/contracts";

import { ApiClientError, createApiClient, type ApiTransport } from "./api/client";
import { createRuntimeApiTransport } from "./api/runtime";

export type WebSessionState = Readonly<{
  session: CurrentSessionResponse["data"] | null;
  error: string | null;
}>;

export async function loadCurrentSession(): Promise<WebSessionState> {
  const cookieHeader = (await cookies()).toString();
  return resolveCurrentSession(createRuntimeApiTransport(), cookieHeader);
}

export async function resolveCurrentSession(
  transport: ApiTransport,
  cookieHeader: string,
): Promise<WebSessionState> {
  try {
    const init: RequestInit = {};
    if (cookieHeader) {
      init.headers = { cookie: cookieHeader };
    }
    const response = await createApiClient(transport).getCurrentSession(init);
    return { session: response.data, error: null };
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      return { session: null, error: null };
    }
    return {
      session: null,
      error: "We could not verify your session. Please try again shortly.",
    };
  }
}
