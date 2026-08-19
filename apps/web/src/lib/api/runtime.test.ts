import { describe, expect, it, vi } from "vitest";

import { createHttpApiTransport } from "./runtime";

describe("web API runtime transport", () => {
  it("rebases internal API paths onto the configured local API origin", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json({ ok: true })),
    );
    const transport = createHttpApiTransport("http://localhost:8787", fetchImplementation);

    await transport.fetch(new URL("https://carbon-api.internal/api/v1/catalog?limit=12"));

    expect(fetchImplementation).toHaveBeenCalledWith(
      new URL("http://localhost:8787/api/v1/catalog?limit=12"),
      undefined,
    );
  });
});
