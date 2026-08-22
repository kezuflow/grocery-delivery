# Frontend/Backend Local Development Audit

This document is the evidence matrix for `AUD-001`. It is not a second backlog. Delivery priority,
slice status, completion records, and resume points live only in `docs/implementation-backlog.md`.
Historical frontend planning is archived at
[`docs/archive/frontend-implementation-backlog-legacy.md`](archive/frontend-implementation-backlog-legacy.md)
for reference only; do not use it to plan new work.

## Frontend Reference Scope

Audit customer phone journeys and the public marketplace against the Mobbin MCP references recorded
in [`docs/frontend-standards.md`](frontend-standards.md), adapted to Carbon's actual contracts and
accessibility requirements. Admin and delivery routes use conventional, responsive Carbon dashboards
built around their existing permission and workflow boundaries; they are not required to reproduce a
consumer-mobile composition.

## Classification

- `matched`: contract, backend, frontend, authorization, failure states, and local evidence agree.
- `partial`: the core workflow works but a required behavior or state is incomplete.
- `mismatch`: frontend and backend expose conflicting behavior or ownership.
- `missing`: a required contract, endpoint, persistence behavior, or UI workflow does not exist.
- `unverified`: implementation exists but required local evidence is absent.

Severity is `P0` release blocker, `P1` production risk, `P2` product gap, or `P3` polish.

## Required Evidence Per Workflow

Record the route and feature owner; contract and typed client; API handler, application service,
repository, and migration; roles and permissions; server-owned values; idempotency and retry rules;
loading, empty, error, forbidden, disabled, offline, and success states; responsive/accessibility
evidence; request count and latency; correlation, audit, and metrics behavior; local fixture and
browser result; classification; severity; and recommended vertical slice.

## Audit Inventory

| Area                    | Workflows to trace                                                                                   | Status     | Evidence                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| Public storefront       | Landing data, hero/banner fallback, plans, catalog preview, auth controls, media, SEO, performance   | unverified | Pending AUD-001                                                        |
| Authentication          | Sign-up, verification, sign-in, password reset, MFA, session failure, role redirect                  | unverified | Pending AUD-001                                                        |
| Marketplace             | Catalog, search, categories, availability, server prices, quantities, cart persistence               | unverified | Local UI exists; populated local API/D1 browser evidence is next       |
| Cart                    | Read/write, validation, stale items, server totals, retry and empty states                           | unverified | Pending AUD-001                                                        |
| Checkout                | Plan/trial, address, window, coupon, payment readiness, quote, cutoff, idempotent order lock         | unverified | Pending AUD-001                                                        |
| Customer account        | Profile, subscription, payments, notifications, sessions, consent, export, deletion                  | unverified | Pending AUD-001                                                        |
| Customer orders/support | History, ownership, detail, receipt, tracking, proof media, cancellation/refund, cases               | unverified | Pending AUD-001                                                        |
| Admin overview          | Projections, alerts, audit activity, permissions, degraded data                                      | unverified | Pending AUD-001                                                        |
| Admin catalog           | Admin reads, item/category visibility, pricing, edit/publish contract                                | partial    | Audit prototype shows reads; complete admin mutation model is missing  |
| Admin orders            | All-order read model, payment/fulfillment state, packing, dispatch, requests                         | partial    | Audit prototype composes feeds instead of a stable order read contract |
| Admin operations        | Procurement, packing, dispatch, support, refunds, promotions, reporting, configuration               | unverified | Pending AUD-001                                                        |
| Admin staff             | Directory, role assignment, permissions, MFA, audit history                                          | partial    | Role assignment exists; staff-directory read contract is missing       |
| Delivery staff          | Assignments, route, event transitions, failures, proof upload, offline queue, sync, history          | unverified | Pending AUD-001                                                        |
| Cross-cutting           | Auth cookies, origins, rate limits, CSP, caching, observability, migrations, OpenNext, local runtime | unverified | Pending AUD-001                                                        |

## Audit Output

For every non-matched row, add a finding with concrete file/route/endpoint evidence, user impact,
severity, dependencies, and the smallest complete vertical slice. Copy only the selected slice name,
status, acceptance checks, and resume point into the canonical implementation backlog.

### Marketplace convergence finding (AUD-001 increment)

- **Route/owner:** `/shop`, `apps/web/src/app/shop/page.tsx` and `apps/web/src/features/catalog/*`.
- **Evidence:** the route already loads `loadMarketplace()` and uses the typed catalog/cart client;
  before this increment it rendered inside the dashboard-oriented `AppShell`, so its phone behavior
  and desktop merchandising hierarchy were not converged.
- **Change:** added a marketplace-specific responsive shell, mobile bottom navigation, pill search,
  real category rail, compact two-column phone cards, desktop grid, sticky cart, and server-backed
  trial/cart states. No ratings, discounts, addresses, or availability flags were invented; prices,
  quantities, availability, and totals remain contract/server-owned.
- **Local evidence:** web lint, typecheck, and 57 focused tests pass. Populated local API/D1 visual,
  accessibility, latency, and cross-role evidence is still required, so classification remains
  `unverified`.
- **Severity/dependency:** P2 product gap with no remote dependency; local marketplace data and
  browser evidence are the resume point before AUD-001 can classify the marketplace as matched.

### Uber Eats marketplace benchmark (AUD-001 increment)

Mobbin references inspected for the benchmark:

- Web [Grocery home](https://mobbin.com/flows/ca71e6a2-7717-4599-b3b5-6e854d34ff3e), [grocery store detail](https://mobbin.com/flows/92e9ae68-8c98-4d02-ac3f-cf8d8707dae6), [browse categories](https://mobbin.com/flows/e23c3ac1-24e0-4b3b-a3b3-d0f6f231c28a), [product detail](https://mobbin.com/flows/51ff48ee-8cca-47b8-854a-a817372dbdc1), and [searching products](https://mobbin.com/flows/ac3d404a-24de-494f-8077-0b6c85d9f22a).
- Mobile [grocery store](https://mobbin.com/flows/dcd26c21-9dfe-431f-97b9-c5bde6947b0e), [in-store search](https://mobbin.com/flows/b5653646-a935-4429-be55-c782bbf79a74), [checkout](https://mobbin.com/flows/4997f6c8-d37e-43f0-9d42-5908c636ea90), [ongoing delivery](https://mobbin.com/flows/5e1230df-8b95-4cc1-a3e9-790553e3f78c), and [account](https://mobbin.com/flows/87df6ee3-3fb5-41aa-8a31-eae7b22fea53).

The benchmark is an interaction and information-architecture target, not permission to copy Uber
branding, assets, prices, or business rules.

| Uber Eats capability         | Carbon evidence today                                                                                               | Reuse                                                                | Missing or requiring a contract decision                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Grocery home and discovery   | `/shop` plus `GET /api/v1/catalog`, `GET /api/v1/plans`, and cart reads                                             | Marketplace shell, categories, server-owned prices, cart             | Store/merchant identity, service-area context, delivery estimate, recommendations, deals, category media, server pagination and facets                                                                                               |
| Store detail and aisles      | No store/detail route; categories are embedded in the catalog response                                              | Existing category and SKU records can back a first single-store view | A true Uber-like clone needs store/merchant, aisle/category hierarchy, store availability, store media, and store-specific catalog boundaries. Decide whether the first release is one `Carbon Market` store or multi-store commerce |
| Item detail and item options | No customer item-detail route or contract                                                                           | Existing SKU description, unit, image, price, and active state       | `GET` item detail, related items, inventory/availability explanation, quantity limits, substitution preferences, and any grocery options                                                                                             |
| Search and browse            | `/shop` search, category filter, client sort and price filter                                                       | Existing `GET /api/v1/catalog` and typed client                      | Server-owned search, pagination/cursors, sort, facets, zero-result suggestions, recent searches, and search analytics                                                                                                                |
| Cart                         | `GET/PUT /api/v1/cart`; local draft plus `/account/cart` editor                                                     | Cart repository, quantity controls, server subtotal                  | Atomic line mutations, stale-price/availability resolution, minimum-order/fee rules, substitution handling, and per-store cart rules if multi-store                                                                                  |
| Checkout and payment         | `/account/checkout`; address book, delivery windows, coupon quote, order lock, payment-method APIs, and idempotency | Most backend foundation already exists                               | Uber-like mobile/web checkout composition, payment-method add flow, delivery instructions, change detection, local provider-adapter coverage, and an explicit choice between weekly-cycle ordering and on-demand delivery            |
| Orders and tracking          | `/account/orders`, order detail, tracking timeline, proof media; delivery assignment/events APIs                    | Order history, tracking events, signed media, support/order requests | Realtime/polling status, ETA, courier identity/contact, map/location contract, reorder, and customer-visible cancellation/refund state machine                                                                                       |
| Account and retention        | `/account`; profile, addresses, subscription, payment history, notifications, privacy, support                      | Existing account APIs and protected session boundary                 | Uber-like mobile information architecture, saved/favorite items, reorder, saved payment UX, notification center, and cross-platform navigation parity                                                                                |

#### Current vertical-slice assessment

1. **Marketplace browse:** `partial`. `/shop` is public, API-backed, and locally verified with
   server-owned search, category filtering, sorting, price bounds, cursor pagination, and a flat
   single-store catalog. Store/aisle hierarchy and richer discovery remain future work.
2. **Cart:** `partial`. Persistence and server totals exist, but the interaction is a saved-cart
   editor rather than a continuously validated commerce cart.
3. **Checkout/payment:** `partial`. The server path is substantially present; the UI and local
   provider-adapter workflow still need evidence and an explicit delivery model decision.
4. **Orders/tracking:** `partial`. Timeline and proof are present; live ETA/location and customer
   action states are absent.
5. **Account:** `partial`. The data surface is broad but is not yet organized as the Uber Eats mobile
   account/order-again experience.

#### Recommended implementation order

1. **VS-MKT-04: Validated cart.** Add server line mutations, stale catalog reconciliation, limits,
   substitution preferences, fees/minimums, and a cart UI that updates without a separate save step.
2. **VS-MKT-06: Checkout and payment completion.** Recompose existing address, window, quote, coupon,
   payment, and idempotent order APIs into the web/mobile flow; add local provider-adapter evidence.
3. **VS-MKT-11: Order tracking.** Reuse orders/events/media, then add ETA/location polling or a
   realtime contract, courier-facing status data, reorder, cancellation/refund states, and support
   entry points.
4. **VS-MKT-12: Account and retention.** Reuse profile/address/payment/order APIs; add favorites,
   reorder, notification center, and platform-parity account navigation.

Admin and delivery dependencies are explicit: admin needs catalog/store/media/deal publication and
inventory controls for the new read model; delivery needs location/ETA events if live tracking is in
scope. The landing page is intentionally excluded from this benchmark.

### VS-MKT-00 through VS-MKT-03 local catalog and first-add readiness

- **Finding:** the local marketplace fixture, public browse route, server-backed catalog query, SKU
  detail route, and first-add authentication/subscription boundary are implemented and locally
  verified.
- **Existing contract:** `PUT /api/v1/admin/launch-configuration` accepts atomic categories, SKUs
  with procurement cost/markup/image URL, and delivery windows. It is protected by the existing
  administrator/superadmin session and records idempotency and audit data.
- **Planned fixture:** publish a single-store Carbon Market mock catalog through the local protected
  API, using the existing local image assets and current weekend windows. Do not add frontend mock
  products or direct D1 writes.
- **Classification:** `complete` for VS-MKT-00 through VS-MKT-03; remaining gaps are intentionally
  queued in later local slices.
- **Acceptance:** API returns non-empty valid catalog data; cache ETag/version changes; delivery
  windows are current; replay is idempotent; `/shop` displays populated desktop and phone states;
  resetting and replaying the local fixture is deterministic.
- **Resume point:** begin VS-MKT-04 with continuous server-validated cart updates and stale-price
  reconciliation. Staging remains deferred.

## Admin Product Workspace Prototype Checkpoint

The legacy FE-015 admin draft is committed only as an audit prototype. It adds navigable catalog,
orders, and staff workspaces so the existing server contracts and capability gaps can be inspected;
it is not a complete vertical slice and must not be labeled production-ready.

Known backend and contract gaps:

- Catalog has server-owned read visibility but no complete admin edit/publish API contract beyond
  the existing launch-configuration workflow.
- Orders composes projection, procurement, dispatch, support, and order-request feeds; the server
  does not provide a stable all-orders read model.
- Staff supports superadmin role assignment and filtered audit history, but there is no staff
  directory read endpoint.

Verification completed for this checkpoint:

- Web lint, typecheck, production build, and 57 focused web unit tests pass.
- Full Playwright coverage passes: 27 tests across phone, tablet, and desktop projects.
- Repository guardrails pass: `pnpm check` completed 55/55 tasks.

Verification and capability work still required before any matching vertical slice can be
completed:

- Focused component tests for the catalog, orders, and staff feature surfaces.
- An API-client test for admin role assignment.
- A browser mutation test covering role-assignment confirmation, success, and failure behavior.
- Local role/permission smoke tests for all three admin routes.
- Local role/permission evidence beyond isolated deterministic component fixtures.

The verification list above is a live handoff: remove items only when the evidence has actually
been produced, and retain any failures as audit findings with a resume point.
