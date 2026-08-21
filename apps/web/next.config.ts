import type { NextConfig } from "next";

export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=15552000; includeSubDomains",
  },
];

if (process.env.NODE_ENV === "development") {
  void import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) =>
    initOpenNextCloudflareForDev(),
  );
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@carbon/contracts"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
