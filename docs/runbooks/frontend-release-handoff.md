# Frontend release handoff

Use this checklist for the `@carbon/web` Worker in staging and production. The web Worker is a
server-rendered Next.js application deployed through OpenNext on Cloudflare.

## Configuration ownership

- `apps/web/wrangler.jsonc` owns the `API`, `ASSETS`, `IMAGES`, `WORKER_SELF_REFERENCE`, and
  `NEXT_INC_CACHE_R2_BUCKET` bindings. The `staging` and `production` environments must point to
  their matching API Worker and cache bucket.
- Local development falls back to `API_BASE_URL=http://localhost:8787`. Browser E2E uses the
  deterministic fixture API on `http://127.0.0.1:8790`; this is test-only and must never be deployed.
- Authentication remains same-origin through `/api/auth/*`. Better Auth session cookies are
  HTTP-only and are forwarded by the web API proxy; do not read or recreate them in client code.
- Customer authentication redirects to the protected `/shop` marketplace. `/account` is the
  account workspace; `/account/catalog` is retained only as a compatibility redirect.
- The API Worker owns `API_PUBLIC_ORIGIN` and `CORS_ORIGINS`. Set the application origin to
  `https://app-staging.getscenepass.com` or `https://app.getscenepass.com` before deployment.

## Build and smoke checks

1. Run `pnpm check` and `pnpm --filter @carbon/web test:e2e`.
2. Run `pnpm --filter @carbon/web build` and inspect the output for unexpected warnings.
3. In the Linux/WSL release environment, run `pnpm --filter @carbon/web preview` and smoke-test
   `/`, `/shop`, `/account`, `/admin`, and `/deliveryman` with customer, admin, and deliveryman
   fixtures. OpenNext's Windows bundle step can fail with `EPERM` while creating symlinks.
4. Verify `https://<origin>/`, `/manifest.webmanifest`, and `/_next/static/*` return successfully.

## Security and caching verification

Confirm every deployed web response includes the CSP, HSTS, `X-Content-Type-Options`,
`X-Frame-Options`, and strict-origin referrer policy from `next.config.ts`. Confirm static Next
assets retain immutable one-year caching, while authenticated HTML and API responses are not cached
by a shared intermediary. Run the checks in `docs/runbooks/security-headers.md` against both web
and API origins.

The public storefront payload is cached by the Next server for 60 seconds and never includes
session-dependent data. Checkout uses a read-only quote request and does not clear coupons during
initial hydration. The web client surfaces API rate limits immediately; payment-provider and queue
retry policies remain separate operational concerns.

The trial migration must be applied before the API Worker is deployed. Trial activation is
`POST /api/v1/subscription/trial` with an active server-provided `planId` and an `Idempotency-Key`.
The API stores the one-time customer eligibility and trial end date; verify a replay returns the
same subscription and a second trial attempt is rejected.

## Rollback and known gaps

- Keep the previous successful OpenNext build available. Roll back by redeploying that build with
  the same Wrangler environment and custom domain, then rerun health, auth, and role smoke checks.
- Do not change D1 migrations or API contracts as part of a web-only rollback.
- Payment-provider hosted UI and signed delivery media are external integrations; verify their
  staging behavior separately. The CSP intentionally allows HTTPS connections and Unsplash images,
  but new third-party origins require an explicit policy review.
- The production OpenNext preview smoke test remains a Linux/WSL release requirement because the
  local Windows symlink limitation is not a product defect.

## Resume point

The frontend slice ledger is complete through FE-012. Future work should start with product-led
polish or a new explicitly scoped slice, preserving the tokens -> UI primitives -> layouts ->
features -> routes dependency direction and the server-owned API boundaries.
