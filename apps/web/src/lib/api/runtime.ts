import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { ApiTransport } from "./client";

type WebRuntimeEnv = CloudflareEnv & {
  API?: ApiTransport;
  API_BASE_URL?: string;
};

export function createRuntimeApiTransport(): ApiTransport {
  const environment = getCloudflareContext().env as WebRuntimeEnv;
  if (environment.API) {
    return environment.API;
  }

  const baseUrl = environment.API_BASE_URL ?? process.env.API_BASE_URL ?? "http://localhost:8787";
  return createHttpApiTransport(baseUrl);
}

export function createHttpApiTransport(
  baseUrl: string,
  fetchImplementation: typeof fetch = fetch,
): ApiTransport {
  return {
    fetch(input, init) {
      const inputUrl = new URL(
        input instanceof URL ? input.toString() : typeof input === "string" ? input : input.url,
      );
      const targetUrl = new URL(`${inputUrl.pathname}${inputUrl.search}`, baseUrl);
      return fetchImplementation(targetUrl, init);
    },
  };
}

export async function forwardApiRequest(
  request: Request,
  transport: ApiTransport,
  path: string,
): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.delete("host");
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
  const init: RequestInit = { method: request.method, headers };
  if (body !== undefined) {
    init.body = body;
  }
  const response = await transport.fetch(new URL(path, "https://carbon-api.internal"), init);
  const responseHeaders = new Headers(response.headers);
  const cookieHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = cookieHeaders.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    responseHeaders.delete("set-cookie");
    for (const cookie of setCookies) {
      responseHeaders.append("set-cookie", cookie);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
