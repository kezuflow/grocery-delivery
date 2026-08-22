import {
  createStagingCarbonMarketManifest,
  STAGING_CARBON_MARKET_IDEMPOTENCY_KEY,
} from "../../packages/contracts/src/marketplace-staging.ts";
import {
  launchConfigurationApplyRequestSchema,
  launchConfigurationResponseSchema,
} from "../../packages/contracts/src/launch-configuration.ts";

const target = process.argv.includes("--staging") ? "staging" : "local";
const apiOrigin =
  process.env.CARBON_MARKET_API_ORIGIN ??
  (target === "staging" ? "https://api-staging.getscenepass.com" : "http://localhost:8787");
const webOrigin =
  process.env.CARBON_MARKET_WEB_ORIGIN ??
  (target === "staging" ? "https://app-staging.getscenepass.com" : "http://localhost:3000");
const sessionCookie =
  process.env.CARBON_MARKET_SESSION_COOKIE ?? process.env.CARBON_STAGING_SESSION_COOKIE;
if (!sessionCookie) {
  throw new Error("CARBON_MARKET_SESSION_COOKIE is required");
}

const manifest = createStagingCarbonMarketManifest(
  process.env.CARBON_MARKET_APPLIED_AT
    ? { appliedAt: process.env.CARBON_MARKET_APPLIED_AT, webOrigin }
    : { webOrigin },
);
launchConfigurationApplyRequestSchema.parse(manifest);
const idempotencyKey =
  process.env.CARBON_MARKET_IDEMPOTENCY_KEY ??
  (target === "staging" ? STAGING_CARBON_MARKET_IDEMPOTENCY_KEY : "local-carbon-market-catalog-v2");
const response = await fetch(`${apiOrigin}/api/v1/admin/launch-configuration`, {
  method: "PUT",
  headers: {
    "content-type": "application/json",
    "idempotency-key": idempotencyKey,
    cookie: sessionCookie,
    origin: webOrigin,
    referer: `${webOrigin}/`,
  },
  body: JSON.stringify(manifest),
});
const body = await response.json();
if (!response.ok) {
  throw new Error(
    `Carbon Market launch configuration failed (${response.status}): ${JSON.stringify(body)}`,
  );
}
const parsed = launchConfigurationResponseSchema.parse(body);
console.log(
  JSON.stringify(
    {
      status: response.status,
      idempotencyKey: parsed.data.idempotencyKey,
      categoryCount: parsed.data.categoryCount,
      skuCount: parsed.data.skuCount,
      deliveryWindowCount: parsed.data.deliveryWindowCount,
      appliedAt: parsed.data.appliedAt,
      replayed: parsed.data.replayed,
      correlationId: parsed.meta.correlationId,
    },
    null,
    2,
  ),
);
