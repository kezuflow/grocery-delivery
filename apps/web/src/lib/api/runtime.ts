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
