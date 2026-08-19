import { createRuntimeApiTransport, forwardApiRequest } from "../../../../lib/api/runtime";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const query = new URL(request.url).search;
  const transport = createRuntimeApiTransport();
  const targetPath = `/api/auth/${path.join("/")}${query}`;
  return forwardApiRequest(request, transport, targetPath);
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
