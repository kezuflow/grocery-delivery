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

The product direction for the remaining marketplace work is an Uber Eats-style grocery clone,
implemented with Carbon branding and weekly-delivery business rules. Customer screens must be
phone-first and desktop-complete. Admin and delivery screens remain responsive operational
dashboards rather than consumer-mobile compositions.

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
2. **Cart:** `complete for VS-MKT-04`. Mutations are immediate and server-confirmed; persisted price
   snapshots and cart versions drive stale-price, unavailable-item, substitution, retry, and reload
   reconciliation. Minimum-order and fee presentation remain checkout concerns.
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
- **Resume point:** begin VS-MKT-05 with subscription onboarding and return-to-shopping behavior.
  Staging remains deferred.

### VS-MKT-04 validated-cart reference and decision record

- **References:** Mobbin MCP retrieval is working again. Image-backed searches on 2026-08-23
  returned the recorded Uber Eats web grocery store-detail flow
  `92e9ae68-8c98-4d02-ac3f-cf8d8707dae6`, exact Uber Eats mobile checkout flow
  `4997f6c8-d37e-43f0-9d42-5908c636ea90`, and a comparable Instacart mobile cart flow
  `c9f47ccc-4930-4fd3-a3f8-09ff32c878f7`. The canonical Mobbin links remain the interaction
  references; no proprietary assets are committed.
- **Adapted structure:** Carbon keeps a sticky cart beside desktop discovery, a compact product-line
  review with quantity steppers, and a prominent phone cart/checkout action above bottom navigation.
  The implementation uses Carbon imagery, semantic tokens, PHP prices, weekly wording, and existing
  auth/subscription boundaries.
- **Behavior decision:** cart mutations are continuous and server-confirmed. The server owns catalog
  price, active state, quantity cap, reconciliation, and cart version. Clients may render optimistic
  intent but must replace it with the returned cart and expose retry/conflict states.
- **Persistence decision:** stored cart lines retain the last confirmed unit-price snapshot and
  substitution preference so later reads can report price changes and remove unavailable lines
  without trusting client commerce values.
- **Verification:** focused contract, D1 repository, API, web utility, and phone/desktop Playwright
  tests pass. Browser evidence covers failed mutation retry, reload and empty-cart persistence,
  keyboard substitution changes, responsive convergence, and Axe checks. `pnpm check` passes all
  55 Turbo tasks.
- **Status:** locally complete, documented, and ready for the VS-MKT-05 resume point.
- **Deferred:** checkout composition, delivery selection, coupons, payment, and final order locking
  stay in VS-MKT-06 and VS-MKT-07.

### VS-MKT-04 store-page visual convergence

- **References inspected:** Uber Eats web
  [store detail](https://mobbin.com/screens/662abc94-ffdf-494a-b566-3d2970896109),
  [store aisle rows](https://mobbin.com/screens/a17b6c78-c6c7-4816-9224-fb5044946114), and
  [product detail context](https://mobbin.com/screens/30847322-7d68-4711-826f-644bb8be1c48);
  mobile [aisle list](https://mobbin.com/screens/f04b5461-97d2-4b21-afa9-65b4270c0e51),
  [store product rows](https://mobbin.com/screens/bce73384-d1e4-4f7d-8c8c-9538c8c66899), and
  [category rows](https://mobbin.com/screens/b68f5f88-666b-4f45-819d-f76705d10384). Images, not
  metadata alone, were used for the comparison.
- **UI decision:** `/shop` is a single-store grocery detail page, not a generic marketplace results
  grid. Desktop uses a compact global utility/search header, aisle navigation in the left rail,
  Carbon merchandising banners, and horizontal aisle sections. Mobile uses the green store search
  header, a sticky grocery category strip, two merchandising banners, horizontally scrollable
  product rows, circular add controls, and a four-item fixed bottom navigation.
- **Removed unsupported invention:** circular C logo, Carbon Market/Browse introduction, “Fresh
  groceries for your weekly box” marketing copy, merchant-summary facts, large result heading,
  grid/list switcher, result count, and the desktop filter/cart column. Carbon naming remains in the
  simple wordmark and Carbon-owned merchandising copy.
- **Merchandising decision:** the catalog page renders server-provided active `storefront-strip`
  promotion banners when present and falls back to two Carbon product-derived cards. Category chips
  cover Grocery, catalog aisles, Greens, and Leafy vegetables. Every product shelf has arrow controls
  on desktop and an accessible in-place See all/Show less expansion; the rail state is derived from
  its actual scroll geometry.
- **Behavior ownership:** existing server-backed search, category, sorting, price bounds,
  pagination, Better Auth, plan gate, cart versioning, server price/availability validation, retry,
  and D1 persistence remain unchanged. The visual convergence does not move commerce rules into the
  browser.
- **Browser evidence:** 1920x1080 and 390x844 local browser passes show no document-level horizontal
  overflow. The desktop canvas fills the viewport; Best sellers arrow and See all interactions were
  verified; the phone page shows both merchandising cards, category chips, three product tiles in
  the first shelf, and Shop/Aisles/Deals/My list bottom navigation. Focused Playwright convergence
  checks pass for phone and desktop.

### VS-MKT-04 storefront chrome refinement

- **Reference attempt:** fresh Mobbin MCP searches for Uber Eats web and mobile
  delivery/pickup, address, search, cart, and navigation chrome returned "Auth required" on
  2026-08-23. A new Mobbin login flow reached Mobbin sign-in but cannot be completed without the
  user's Mobbin session. The implementation therefore stays bounded to the previously
  image-inspected store-detail, aisle, and mobile product-row screens linked above.
- **UI decision:** desktop gets a compact wordmark, selected-address control, wide store search,
  cart badge, account access, and a left rail that defaults expanded and collapses to icon-only
  navigation. Mobile gets a separate fulfillment/address row above search and cart while preserving
  the fixed four-item bottom navigation.
- **Contract decision:** the selected delivery address is loaded through the existing typed
  delivery-address endpoint; cart chrome is derived from the existing cart response. Weekly
  Delivery is active and Pickup is exposed only as a disabled future mode, so the frontend does not
  invent a fulfillment contract.
- **Failure and empty behavior:** signed-out or address-empty sessions show delivery-area/setup
  guidance without fabricating an address; empty carts show an unbadged cart control; existing
  catalog and cart error/retry states remain authoritative.
- **Accessibility decision:** the mobile delivery label uses high-contrast text on the Carbon green
  surface after the phone Axe run identified the lower-opacity label as a serious WCAG contrast
  violation. Delivery and Pickup expose pressed/disabled semantics, the rail toggle exposes its
  expanded state, and collapsed icon links retain accessible names and keyboard operation.
- **Test harness decision:** Playwright uses an isolated `.next-e2e` output directory so its local
  fixture server can run on port 3100 while the user's manual Next development server remains live
  on port 3000. Generated E2E output is excluded from Git and formatting checks.
- **Verification:** focused marketplace Playwright runs pass 2/2 for desktop and 2/2 for phone,
  covering responsive convergence, collapsed and expanded navigation, address/cart visibility,
  disabled Pickup, server-backed search, document overflow, and Axe. The web unit suite passes
  65/65 tests, including graceful delivery-address failure, and repository `pnpm check` passes all
  55 Turbo tasks.
- **Local browser evidence:** the 1920x1080 desktop view fills the available viewport and preserves
  the dense store layout in both rail states. The 390x844 phone view keeps the compact fulfillment,
  address, search, cart, merchandising, shelf, and bottom-navigation composition with no horizontal
  document overflow.
- **Request and persistence impact:** the selected address read is issued in parallel through the
  existing typed client. It adds no write path or client-owned commerce state; address persistence,
  cart quantity/count, prices, availability, roles, and weekly fulfillment policy continue to come
  from the existing API and local D1 boundaries.
- **Status:** locally complete and ready to commit and push as the final VS-MKT-04 refinement.
- **Design language alignment:** the Uber Base Color 2.0 reference at
  https://base.uber.com/6d2425e9f/p/9906f6-color-20 was inspected for neutral surfaces, strong
  contrast, and subdued borders. The marketplace maps those principles to Carbon-owned tokens and
  uses `next/font/google` Outfit with local Next font output, avoiding a runtime font request.

### VS-MKT-05 subscription onboarding and return-to-shopping

- **Routes inspected and changed:** `/shop`, `/shop/[slug]`, `/account`, and the new protected
  `/account/subscribe`. Catalog and product-detail first-add actions now preserve the local path and
  query and converge on the protected onboarding route; the account no-subscription state links to
  the same route.
- **Contracts, APIs, and use cases inspected:** `packages/contracts/src/plans.ts`, the application
  subscription service, `GET /api/v1/plans`, `GET /api/v1/subscription`, and
  `POST /api/v1/subscription/trial`. The existing request accepts only `planId`; fee, credit, trial
  eligibility, trial dates, billing state, and conflict responses remain server-resolved.
- **Repositories and persistence inspected:** the subscription repository boundary, D1
  implementation, and forward-only `packages/db/migrations/0038_subscription_trials.sql` already
  persist trial start/end and idempotent subscription state. No new table, migration, repository,
  endpoint, or parallel model was justified.
- **Authorization:** the page resolves `requireCustomerSession`; the APIs retain the Better Auth
  customer session guard and correlation-aware error envelope. Non-customer auth continuation
  reports that a customer account is required instead of attempting a commerce write.
- **Mobbin MCP evidence:** OAuth login is complete and direct MCP retrieval returned image-backed
  Uber Eats web [Subscribing to a plan](https://mobbin.com/flows/b2c278e9-6d7d-4be1-b48b-152905a71d01)
  and iOS [Subscribing to Uber One](https://mobbin.com/flows/e61a0647-babb-4ada-816e-ffddf6657961)
  flows. The web flow showed a dedicated benefits/activation page and an explicit success return;
  the iOS flow showed stacked benefits, compact plan cards, trial emphasis, and a full-width bottom
  action. Only these visible structural decisions were adapted.
- **Responsive UI decision:** desktop uses a broad two-column benefits/plan layout and explicit
  account-shell navigation; phone uses a separate single-column composition with touch-sized radio
  and action controls. Neither viewport reuses the removed inline dialog. Carbon tokens, Outfit,
  PHP prices, copy, and weekly catalog rules replace all external branding and content.
- **Error and retry decision:** malformed or external return targets normalize to `/shop`; a failed
  trial activation retains the same idempotency key for retry and exposes the server message;
  empty plans and already-active subscriptions get dedicated states. The key is discarded only on
  success.
- **Accessibility decision:** plan choices expose `radiogroup`/`radio`, checked and disabled state,
  keyboard Space operation, focus-visible outlines, alert/status semantics, and corrected high
  contrast on the active-state return action. Axe serious/critical checks and horizontal-overflow
  checks pass on phone and desktop.
- **Verification evidence:** web unit tests pass 67/67; web typecheck and lint pass; focused
  Playwright passes 2/2 phone and 2/2 desktop, with desktop explicitly set to 1920x1080. Coverage
  proves return-query preservation, server-owned fee/credit display, pending/disabled activation,
  backend failure and retry key reuse, persisted reload, active state, invalid return fallback,
  and empty plans. Repository `pnpm check` passes all 55 Turbo tasks and `git diff --check` passes;
  the slice is locally complete.
- **Request/latency/observability:** removing plan loads from catalog and product-detail server
  compositions eliminates one public request on those routes. The onboarding account loader keeps
  its reads parallel; activation uses the existing single idempotent write. Existing correlation
  IDs remain available through the typed error and no new telemetry or remote dependency was added.

### VS-MKT-06 weekly checkout review

- **Routes inspected:** `/account/checkout`, `/account`, `/account/cart`, and the existing address-book
  surface. The checkout route now composes explicit address, delivery-time, promotion, quote, and
  payment-readiness sections.
- **Contracts and APIs reused:** delivery address and window schemas, checkout quote/coupon schemas,
  and the typed client methods for address list/select, window select, quote, coupon preview/removal,
  and order creation. Protected customer session and correlation-aware errors remain unchanged.
- **Backend and persistence audit:** existing D1 address/window repositories, promotion pricing service,
  cart reconciliation, subscription eligibility, and order idempotency were sufficient; no migration,
  duplicate endpoint, or parallel model was justified. The server remains authoritative for serviceability,
  capacity, promotion eligibility, PHP amounts, credits, overage, and total due.
- **Mobbin evidence:** image-backed MCP inspection used web [Promotions](https://mobbin.com/flows/a11ea1e4-d832-4ef9-b001-e125689f0150),
  web [Store detail](https://mobbin.com/flows/92e9ae68-8c98-4d02-ac3f-cf8d8707dae6), iOS
  [Checkout](https://mobbin.com/flows/4997f6c8-d37e-43f0-9d42-5908c636ea90), and iOS
  [View basket grocery](https://mobbin.com/flows/af44648f-8272-49ff-9169-a5d1c4f0f0a1). Adapted decisions:
  explicit fulfillment sections, touch-friendly time selection, distinct coupon row, grouped totals,
  dense desktop two-column review, and a sticky mobile confirmation action.
- **Responsive/accessibility decisions:** phone and desktop use intentionally different composition;
  saved address and window controls use native pressed/disabled semantics, keyboard operation, focus
  outlines, status announcements, and actionable empty states. Browser checks at approximately 390x844
  and explicitly 1920x1080 show no document overflow and no serious/critical Axe violations.
- **Verification:** web unit tests 67/67, lint/typecheck, and focused checkout Playwright 2/2 phone plus
  2/2 desktop pass. Fixture scenarios cover invalid/valid/removable coupon behavior, address/window
  selection, unavailable options, and empty-state ordering guards. VS-MKT-07 remains the next backend/UI
  slice for local payment-adapter completion and order confirmation.

### VS-MKT-07 local payment completion

- **Existing behavior reused:** `POST /api/v1/orders` locks the reviewed cart and server quote with
  idempotency; `POST /api/v1/payments/charge` resolves the order total server-side, invokes the local
  `FakePaymentProvider`, persists the payment attempt/ledger, and updates order payment state.
- **New frontend contract use:** the typed client now exposes `chargePayment`; checkout separates order
  and payment idempotency keys, keeps the locked order across failure, and order detail loads saved
  payment methods for retry. Payment credentials remain provider-owned; only references cross the API.
- **Failure and persistence decisions:** declined attempts expose a retry without recreating the order;
  pending and paid states render as explicit status messages. The server remains authoritative for
  charged amount, method status, payment state, and ledger history.
- **Verification:** focused local Playwright payment retry passes 1/1 phone and 1/1 desktop, with
  keyboard-selectable payment method, confirmation routing, no overflow, and serious/critical Axe checks.
  Mobbin payment/confirmation search was attempted after OAuth refresh but the connector again returned
  `Auth required`; previously inspected checkout references remain the only source used.

### VS-MKT-08 permission-scoped catalog operations

- `/admin/catalog` now reflects effective permissions: catalog/pricing users have read-only catalog
  evidence while superadmins can enter `/admin/configuration`.
- The existing launch manifest remains the smallest safe write boundary because it atomically owns
  categories, SKUs, procurement cost, markup-derived price, windows, cache version, audit history,
  and idempotency. The API independently enforces superadmin scope.
- Browser evidence covers successful contract-valid application at phone and desktop sizes, pending
  controls, result counts, Axe, and overflow. A client-generated retry key is now initialized after
  hydration so server/client markup remains deterministic.

### VS-MKT-09 weekly operations

- Reused the existing procurement demand/purchase/shortage/substitution, packing manifest, and
  dispatch assignment contracts, use cases, D1 repositories, audit events, and permission guards.
- The UI keeps server cycle/order/window/payment/packing prerequisites authoritative and exposes
  labeled mobile/desktop forms with pending, success, and correlation-aware failure feedback.
- Focused browser evidence passes on phone and desktop for purchase, shortage, packing, and dispatch,
  including Axe and document-overflow checks. No backend gap or schema change was required.

### VS-MKT-10 customer substitutions and support

- **Routes and UI inspected:** `/account`, `/account/support`, the account substitution decision list,
  customer support history/contact form, and cancellation/refund request form. The separate phone and
  desktop compositions retain Carbon account navigation while keeping request actions reachable and
  labeled at both viewports.
- **Contracts and APIs inspected:** `customer-substitutions.ts`, `order-requests.ts`, `support.ts`,
  `GET /api/v1/order-substitutions`, `POST /api/v1/order-substitutions/:id/decision`,
  `GET/POST /api/v1/order-requests`, and `GET/POST /api/v1/support/cases`, plus the protected admin
  support/order-request queues and decision routes. The typed web client already covered every required
  customer mutation and response schema.
- **Use cases, repositories, and tables inspected:** existing API handlers resolve the active customer,
  order ownership, substitution state, idempotency, and administrator permission scope before calling
  the customer-substitution, order-request, and support repositories. Their D1 implementations and
  existing forward-only schema already persist request/decision state, so no backend extension or
  migration was justified.
- **Server ownership and error decisions:** the client submits only a decision, request kind/reason, or
  support subject/message. The server owns customer/order association, eligibility, status transitions,
  timestamps, replay, and administrative resolution. Pending actions are disabled, successful writes
  are announced, and correlation-aware API failures remain recoverable without inventing local state.
- **Accessibility decision:** shared `Input`, `Select`, and `Textarea` primitives now use React `useId`
  when no explicit ID is supplied, connecting labels and hint/error descriptions without changing
  caller APIs. This fixed the previously visible-but-unlabeled Subject, Message, Request, and Reason
  controls across account forms.
- **Mobbin evidence:** the previously inspected mobile
  [Account](https://mobbin.com/flows/87df6ee3-3fb5-41aa-8a31-eae7b22fea53) flow informed compact
  account/request hierarchy only. The CLI reported a successful Mobbin OAuth login on 2026-08-23, but
  MCP retrieval still returned `Auth required`; no additional visual claims were made.
- **Verification evidence:** all 67 web tests plus web lint/typecheck pass. Focused local Playwright
  passes 1/1 phone and 1/1 desktop for substitution acceptance, support creation, refund-request
  creation, status announcements, no horizontal overflow, and no serious/critical Axe violations.
  Existing API tests retain validation, unauthenticated/ownership, permission, persistence, and
  idempotent replay coverage. Request impact is limited to explicit customer mutations and the current
  server refresh; no polling, new latency path, dependency, or observability surface was introduced.

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
