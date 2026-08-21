import { describe, expect, it } from "vitest";

import nextConfig, { securityHeaders } from "../next.config.js";

describe("web response configuration", () => {
  it("applies the shared security policy to every route", async () => {
    const routes = await nextConfig.headers?.();

    expect(routes).toEqual([{ source: "/:path*", headers: securityHeaders }]);
    const contentSecurityPolicy = securityHeaders.find(
      (header) => header.key === "Content-Security-Policy",
    );

    expect(contentSecurityPolicy?.value).toContain("default-src 'self'");
    expect(securityHeaders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "Content-Security-Policy" }),
        { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ]),
    );
  });
});
