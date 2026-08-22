# Implementation Backlog

This is the active local-development queue for Carbon Food Delivery. Detailed records for completed
work remain in Git history and archived runbooks; they do not define current development scope.

Follow `docs/project-guidance.md`. Local implementation and verification are the default. Do not
deploy, publish remote data, or run staging rehearsals unless the user explicitly asks for that
action in the current conversation. Every completed local slice must be committed and pushed before
the next slice begins.

## Working Rules

- Keep one small slice `in progress`.
- Define the user outcome, affected roles, scope, acceptance checks, and failure states before broad
  implementation.
- Trace relevant behavior through route, contract, API, application, domain, repository or migration,
  asynchronous work, UI states, and tests.
- Use local Workers, local D1, deterministic fixtures, and local browser sessions.
- Run focused checks first, then `pnpm check` and relevant local Playwright/accessibility/visual
  checks.
- Commit and push the completed slice after verification, before starting the next slice.
- Update this file when active scope, local evidence, or the resume point changes.
- Preserve unrelated working-tree changes.

## Status

- `complete`: implemented and verified for local development.
- `in progress`: currently being implemented or verified locally.
- `next`: ready after the active slice.
- `planned`: ordered local work.
- `blocked`: requires a product or technical decision that cannot be inferred safely.
- `deferred`: intentionally paused until the user starts that phase.

## Current Product Direction

Build a single-store Carbon Market experience with high-quality grocery discovery and ordering on
desktop and phone. Public browsing is allowed. Authentication and an active subscription are
required at first add-to-cart. Weekly fulfillment remains the only active mode: Friday cutoff,
weekend delivery windows, server-owned pricing, and cycle-exception availability.

Use Mobbin references for interaction and information architecture immediately before implementing
each customer journey. Adapt the patterns to Carbon branding, contracts, authorization, and weekly
fulfillment rules. Do not copy external branding, assets, prices, or business rules.

Every customer UI slice needs local desktop and phone comparison, interaction corrections,
Playwright assertions, accessibility checks, and stable loading, empty, error, forbidden, pending,
offline, and success states where applicable.

## Local Marketplace Queue

| Slice     | Outcome                                                                 | Status   |
| --------- | ----------------------------------------------------------------------- | -------- |
| VS-MKT-00 | Realistic local Carbon Market data and weekly operating configuration   | complete |
| VS-MKT-01 | Public grocery discovery on web and phone                               | complete |
| VS-MKT-02 | Server-backed search, categories, sorting, filtering, and pagination    | complete |
| VS-MKT-03 | Product detail and first-add authentication/subscription flow           | complete |
| VS-MKT-04 | Continuous server-validated weekly cart                                 | planned  |
| VS-MKT-05 | Subscription onboarding and return-to-shopping flow                     | planned  |
| VS-MKT-06 | Weekly address, delivery-window, coupon, quote, and checkout flow       | planned  |
| VS-MKT-07 | Local payment-adapter completion, retry, and order confirmation         | planned  |
| VS-MKT-08 | Permission-scoped local admin catalog operations                        | planned  |
| VS-MKT-09 | Weekly procurement, shortages, packing, and dispatch operations         | planned  |
| VS-MKT-10 | Customer substitutions, cancellation/refund requests, and support       | planned  |
| VS-MKT-11 | Delivery-staff execution and customer tracking                          | planned  |
| VS-MKT-12 | Account parity, reorder, favorites, saved items, and retention features | planned  |
| VS-MKT-13 | Local responsive, accessibility, performance, and workflow hardening    | planned  |
| VS-MKT-14 | Staging promotion and release evidence                                  | deferred |

Landing-page work is outside the marketplace program and resumes after the core marketplace slices.

## Completed Slices: VS-MKT-00 through VS-MKT-03

### Local Outcome

Local development has realistic API-backed marketplace data so `/shop` can be designed and tested
with populated product cards, categories, server-owned prices, images, and delivery windows without
depending on staging.

### Delivered Scope

- Use the existing 22 normalized `800x800` WebP assets in `apps/web/public/marketplace`.
- Use the contract-backed produce and herbs manifest as the first deterministic catalog fixture.
- Generate current Manila weekend delivery windows for the active weekly cycle.
- Publish through the protected `PUT /api/v1/admin/launch-configuration` API into local D1.
- Keep procurement cost, markup, customer price, active state, category ownership, capacity, cycle,
  and cache version server-owned.
- Do not add frontend-only mock products, direct SQL fixture writes, remote credentials, or remote
  publication to this slice.

### Local Acceptance Checks

- Local D1 migrations apply from a clean state.
- A deterministic local administrator session can call the protected launch-configuration endpoint.
- Publication returns non-empty categories, SKUs, and current delivery windows.
- `GET /api/v1/catalog?limit=100` returns valid relationships, PHP centavo prices, pagination, and a
  changed ETag/cache version.
- Replaying the same local manifest is idempotent.
- Missing images use the existing product fallback without shifting card layout.
- Local `/shop` renders populated desktop and phone states and passes relevant accessibility and
  interaction checks.
- Focused contract/API/web tests and `pnpm check` pass.

### Current Evidence

- The local image assets and 22-SKU manifest exist.
- Focused manifest contract tests exist.
- `pnpm marketplace:publish:local` now defaults to `http://localhost:8787` and
  `http://localhost:3000`; it cannot default to the staging origins.
- Local Better Auth now runs from `apps/api/.dev.vars` against local D1. The local bootstrap admin
  signs in through `/api/auth/sign-in/email`, resolves as `admin/superadmin`, and reaches `/admin` in
  the local browser.

### Resume Point

Continue VS-MKT-04 locally with continuous server-validated cart updates and stale-price handling.
Staging authentication and promotion remain deferred.

### Local Browser Evidence

- `GET http://localhost:3000/` renders without a session lookup or sign-in controls; its primary
  navigation and all plan/trial actions lead to `/shop` with `Go to app`.
- `GET http://localhost:3000/shop` returns `200` for a guest and renders the populated local catalog
  (22 products, categories, and server-owned PHP prices).
- A guest can search, filter, sort, and browse the catalog. The cart remains read-only and clearly
  prompts for authentication.
- Selecting `Add Apples to cart` as a guest opens the Better Auth dialog. Authenticated customers
  retain cart editing and saved-cart behavior.
- `GET http://localhost:3000/api/v1/catalog?search=apples&sort=price-high` returns the filtered
  Apples result from the local API.
- `GET http://localhost:3000/shop/apple` renders the public product detail route; its first-add
  action opens authentication, then plan selection when the customer has no active subscription.
- The first-add path uses Better Auth, server-owned plan pricing, an idempotent trial activation,
  and the existing server cart API. Continuous cart reconciliation remains VS-MKT-04.

## Known Marketplace Gaps

- The current catalog is flat; store identity, aisle hierarchy, store media, recommendations,
  promotions, service-area context, and delivery estimates need explicit contracts.
- Related items, limits, availability explanation, and substitution preferences are missing from
  product detail.
- Facets, analytics, and richer server merchandising remain future work; the core query, sorting,
  price bounds, and cursor pagination are server-owned.
- Cart persistence exists, but continuous server reconciliation and stale-price/availability handling
  need a dedicated slice.
- Checkout foundations exist, but the responsive composition and local provider-adapter workflow
  need verification.
- Order tracking lacks ETA/location and some customer-visible cancellation/refund states.

Record detailed route and contract findings in `docs/frontend-backend-audit.md` as they are discovered
during local implementation. The audit must support development, not block it.

## Deferred Promotion

Existing staging and production configuration, deployment scripts, runbooks, and historical evidence
remain in the repository. They are dormant until the user explicitly starts VS-MKT-14 or another
promotion task. At that point, create a separate checklist for remote migrations, secrets, provider
sandbox behavior, deployment, smoke evidence, observability, rollout, and rollback.

Do not treat missing staging or production evidence as a local-development failure.
