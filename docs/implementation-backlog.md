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

The customer experience is intentionally an Uber Eats-style grocery marketplace: fast discovery,
store/category context, prominent search, clear item detail, persistent cart access, and a short
checkout path. Every customer slice must be ready on phone and desktop before it is marked complete.
Admin and delivery slices use Carbon's dashboard pattern: responsive navigation, dense operational
summaries, tables or queues where appropriate, permission-aware actions, and usable phone layouts.

The Mobbin benchmark flows currently recorded in `docs/frontend-backend-audit.md` are the reference
set for grocery home, store detail, category browse, product detail, search, checkout, delivery
tracking, and account journeys. The references guide interaction decisions only; Carbon's product
rules and server contracts remain authoritative.

Every customer UI slice needs local desktop and phone comparison, interaction corrections,
Playwright assertions, accessibility checks, and stable loading, empty, error, forbidden, pending,
offline, and success states where applicable.

## Admin Dashboard Recovery Program

**Status:** active. This program supersedes the prior direction that treated the launch
configuration manifest as the ordinary catalog editor. Historical completion records below remain
evidence for their original local slices, not the target product model.

### Product Decisions

- Catalog is the normal product CRUD surface. Editing a SKU must not require reconstructing a full
  launch manifest.
- Configuration is a superadmin operational-policy console with buttons, toggles, segmented
  choices, and bounded inputs. It is not a catalog, category, or SKU editor.
- Weekly scheduled delivery remains the active fulfillment model. Instant delivery is displayed as
  a disabled future option until inventory, availability, pricing, checkout, and dispatch support
  exist end to end.
- Guests may browse and build a cart. Sign-in or account creation remains required before payment
  and order creation; do not create anonymous or orphan orders.
- Operational values remain server-owned, validated, authorized, idempotent where retriable, and
  audited. Store PHP money in centavos and interpret weekly schedules in `Asia/Manila`.

### Configuration Target

The replacement `/admin/configuration` route loads current server truth and groups these policies:

- **Store operations:** open/paused ordering state, pause reason, optional resume date, current
  cycle, and an explicitly confirmed close-ordering action.
- **Delivery model:** weekly scheduled delivery, disabled instant-delivery choice, delivery fee,
  minimum order, and service-area availability.
- **Weekly delivery:** cutoff day/time, next-cutoff preview, manual cycle-lock override,
  delivery-window active state, capacity, and lead time.
- **Checkout access:** guest-cart policy, required sign-in before payment, and customer contact
  verification requirements.
- **Later policies:** cancellation/subscription cutoffs, substitutions, per-SKU quantity limits,
  stock-out behavior, and customer-support contact details.

The backend needs a dedicated typed operational-settings contract, repository, forward-only D1
migration, revision/concurrency check, protected read/update endpoints, validation, audit events,
and field-level errors. Preserve `/api/v1/admin/launch-configuration` only as an explicitly named
batch launch/import process with a complete-data preview and strong confirmation.

### Ordered Local Slices

| Slice | Outcome                                                                                         | Status   |
| ----- | ----------------------------------------------------------------------------------------------- | -------- |
| AD-00 | Truthful per-feed dashboard states and permission/navigation/action parity                      | complete |
| AD-01 | Shared admin list, queue, drawer, confirmation, feedback, and responsive interaction primitives | next     |
| AD-02 | Server-owned operational settings and Configuration policy console                              | planned  |
| AD-03 | Catalog CRUD, active/paused/archived lifecycle, and persistent product-media library            | planned  |
| AD-04 | Canonical Orders list, filters, pagination, and lifecycle detail                                | planned  |
| AD-05 | Contextual Procurement demand, purchase, shortage, and substitution workflow                    | planned  |
| AD-06 | Packing queue, exceptions, and completion workflow                                              | planned  |
| AD-07 | Dispatch board with eligible order/window/driver assignment and conflict visibility             | planned  |
| AD-08 | Support case lifecycle, Promotions, Staff directory, and Reporting completion                   | planned  |
| AD-09 | Shell cleanup, accessibility, mobile behavior, and full cross-role E2E coverage                 | planned  |

### AD-00 Local Completion Record

- **Outcome:** Overview, Orders, Catalog, and workspace feeds now load independently and preserve
  successful data when another feed fails. Each feed records `not_requested`, `ready`, `empty`,
  `forbidden`, or `unavailable` with the server message and correlation ID where available.
- **Permission parity:** Shared workspace permission maps now drive route guards, navigation,
  overview links, Orders access, Catalog access, and visible Catalog mutations. Packing and Support
  roles can reach the Orders workspace; Pricing-only users can read Catalog without edit actions;
  superadmin-only configuration and staff routes remain protected. The API remains authoritative for
  every mutation.
- **Truthful UI:** Overview health and metrics no longer imply operational zero values when a feed
  is missing or failed. Alerts, activity, cycle metrics, Orders metrics, Catalog availability, and
  Staff audit reads distinguish restricted, unavailable, empty, and successful states. Correlation
  references remain visible for recoverable server failures.
- **Trace and server ownership:** This slice changes the web server loaders and UI composition only;
  existing typed API contracts, Hono authorization, repository persistence, validation, idempotency,
  audit, PHP-centavo money, and Asia/Manila weekly-cycle rules remain unchanged. Independent feed
  requests run in parallel, so one unavailable endpoint does not erase other responses.
- **Focused verification:** Admin feed classification, navigation parity, and workspace visibility
  tests pass. The web suite passes 21 files and 69 tests; web lint and typecheck pass. Repository
  `pnpm check` passes all 55 Turbo tasks, including formatting, lint, typecheck, unit, API, and D1
  integration checks. `git diff --check` passes before commit.
- **Browser evidence:** Local in-app browser verification passed on `/admin`, `/admin/orders`,
  `/admin/catalog`, and `/admin/dispatch`. Desktop and 390x844 phone overview layouts show explicit
  restricted/unavailable states without false zeros; phone document width is 375px within a 390px
  viewport. The superadmin Catalog fixture rendered 22 server-backed rows and its item menu exposed
  `Edit`, `Pause`, and `Delete`. Orders rendered unavailable/restricted feed states. No new API
  requests, migrations, dependencies, polling, or observability surfaces were added.
- **Mobbin limitation:** The required pre-UI Mobbin MCP search for Supabase/admin dashboard patterns
  was attempted, but the connector returned `Auth required`; no Mobbin image or visual claim was
  used for AD-00. Carbon's existing dashboard language and the repository's product direction remain
  the reference.
- **Known gaps:** Packing currently has no separate read endpoint and therefore truthfully reports
  its procurement-backed feed as not connected for packing-only roles. Catalog lifecycle semantics,
  shared interaction primitives, operational Configuration policy editing, and full cross-role E2E
  coverage remain in later slices.

### Slice Acceptance Baseline

Every admin slice must include explicit loading, empty, unavailable, forbidden, validation,
pending, retry, and success states; focused contract, repository, API, UI, authorization, and
idempotency tests where relevant; local desktop and phone browser evidence; `pnpm check`; and a
conventional commit pushed to the configured upstream before the next slice begins. Preserve
unrelated working-tree changes.

### AD-00 Acceptance Checks

- A failed dashboard feed does not erase independent feeds or render as a healthy zero state.
- Overview never reports systems operational without a confirmed healthy relevant feed.
- Navigation, route guards, workspace links, and visible mutations use the same permission model.
- Unauthorized mutations are absent or disabled with a meaningful reason; the server remains the
  authority.
- Partial-feed failure and cross-permission route/action behavior have focused automated coverage.

### Resume Prompt

```text
Continue the Carbon Food Delivery Admin Dashboard Recovery Program from the next unfinished AD
slice in docs/implementation-backlog.md. Read AGENTS.md, docs/project-guidance.md,
docs/implementation-backlog.md, and docs/frontend-backend-audit.md first. Preserve unrelated
working-tree changes and work locally only.

The product direction is fixed: Catalog is normal product CRUD; Configuration is server-owned
operational policy management, not catalog editing; weekly scheduled delivery is active; instant
delivery is visible only as a disabled future option; and guests may build a cart but must sign in
or create an account before payment and order creation.

Implement only the next independently reviewable slice. AD-00 is complete; begin with AD-01 unless
the backlog says another slice is `next`. Trace route,
contract, API, application/domain, repository/migration, UI states, and tests before editing. Add
focused tests, run pnpm check, inspect git diff --check and the staged diff, update this backlog
with local evidence and the next resume point, commit with a conventional commit, and push to the
configured upstream. Do not deploy, publish fixtures, or make remote configuration changes.
```

## Local Marketplace Queue

| Slice     | Outcome                                                                 | Status   |
| --------- | ----------------------------------------------------------------------- | -------- |
| VS-MKT-00 | Realistic local Carbon Market data and weekly operating configuration   | complete |
| VS-MKT-01 | Public grocery discovery on web and phone                               | complete |
| VS-MKT-02 | Server-backed search, categories, sorting, filtering, and pagination    | complete |
| VS-MKT-03 | Product detail and first-add authentication/subscription flow           | complete |
| VS-MKT-04 | Continuous server-validated weekly cart                                 | complete |
| VS-MKT-05 | Subscription onboarding and return-to-shopping flow                     | complete |
| VS-MKT-06 | Weekly address, delivery-window, coupon, quote, and checkout flow       | complete |
| VS-MKT-07 | Local payment-adapter completion, retry, and order confirmation         | complete |
| VS-MKT-08 | Permission-scoped local admin catalog operations                        | complete |
| VS-MKT-09 | Weekly procurement, shortages, packing, and dispatch operations         | complete |
| VS-MKT-10 | Customer substitutions, cancellation/refund requests, and support       | complete |
| VS-MKT-11 | Delivery-staff execution and customer tracking                          | complete |
| VS-MKT-12 | Account parity, reorder, favorites, saved items, and retention features | complete |
| VS-MKT-13 | Local responsive, accessibility, performance, and workflow hardening    | complete |
| VS-MKT-14 | Staging promotion and release evidence                                  | deferred |

Landing-page work is outside the marketplace program and resumes after the core marketplace slices.

### Completed Admin Console UI Refinement

- **Status:** locally complete as a user-requested visual and interaction refinement of the existing
  permission-scoped admin workspaces.
- **Outcome:** `/admin` and its existing workspace routes now use a dense operations-console shell
  with a compact product rail, grouped and permission-filtered navigation, active-route treatment,
  local-environment context, keyboard-accessible workspace search, compact operational metrics,
  alert/activity lists, and responsive mobile navigation. Server-owned dashboard data, route URLs,
  and permission guards are unchanged.
- **References:** Supabase project overview, navigation, search, observability, and table-editor
  patterns inspected through Mobbin MCP on 2026-08-23. Carbon branding, content, icons, and data
  remain original to this application.
- **Local evidence:** desktop browser inspection at `http://localhost:3000/admin` confirmed the
  complete navigation and dashboard hierarchy; searching `proc` returned only the Procurement
  workspace. Web typecheck, lint, and all 68 focused web tests pass.
- **Impact:** no API, persistence, latency, or observability boundary changed. The added client code
  is limited to current-route highlighting and local filtering of the already-authorized navigation
  list.

### Admin Workspace Table And Catalog Flow Refinement

- **Status:** locally complete as a follow-up UI/UX slice; direct catalog persistence remains behind
  the existing approved launch-configuration boundary.
- **Outcome:** admin workspaces now render scoped operational tables for procurement, packing,
  dispatch, support, and promotions instead of showing unrelated actions on every route. Shared
  tables use compact headers, horizontal overflow, row density, status pills, and route-specific
  controls consistent with the Supabase table-editor reference.
- **Catalog flow:** `/admin/catalog` is now a searchable and category-filterable list with product
  thumbnails, row inspection, server-owned price/category/status details, local image upload preview,
  and a reusable local image library. Persisted catalog changes still go through the superadmin-only
  launch manifest API so client code cannot bypass server pricing or authorization rules.
- **Local evidence:** browser checks covered catalog search, row inspection, image-library selection,
  Procurement empty/feed state, and Promotions scoping. `pnpm check` passed with 55 successful tasks,
  including 68 web tests.
- **Next backend slice:** add a dedicated admin catalog command contract and media-object binding if
  product-level create/update/archive and durable image upload are required beyond the current launch
  manifest workflow.

### Catalog Shell And Row Action Refinement

- **Status:** locally complete as a follow-up visual and interaction refinement.
- **Outcome:** `/admin/catalog` keeps the catalog table directly in the admin shell without the
  enclosing card treatment. The former hover-only `Inspect` action is replaced with a compact,
  keyboard-visible overflow menu containing `Edit`, `Pause`, and `Delete`.
- **Behavior:** `Edit` opens the existing catalog item dialog. `Pause` and `Delete` explain the
  current server-owned launch-configuration boundary rather than attempting unauthorized client-side
  mutations; a dedicated catalog command API remains the next backend slice.
- **Local evidence:** desktop browser inspection confirmed the unboxed table and accessible row menu;
  `pnpm check` passed all 55 Turbo tasks, including 68 web tests.

### Configuration Form Refinement

- **Status:** locally complete as a user-requested admin workflow refinement.
- **Outcome:** `/admin/configuration` no longer exposes the launch manifest as a raw JSON textarea.
  Superadmins now edit approval reason, categories, catalog items, procurement inputs, markup,
  image URLs, active states, and delivery windows through structured controls with add/remove row
  actions, reset, and an explicit apply action.
- **Boundary:** the form still submits the existing typed launch-configuration contract to the
  superadmin-only endpoint; server-derived prices, authorization, and idempotency remain unchanged.
- **Local evidence:** browser inspection confirmed the JSON editor is absent and the structured
  sections render with accessible controls. `pnpm check` passed all 55 Turbo tasks, including 68 web
  tests.

### Inline Catalog Status Actions

- **Status:** locally complete as a follow-up admin workflow correction.
- **Outcome:** catalog administrators can now pause or archive an item directly from the row overflow
  menu. The old launch-configuration handoff message has been removed for these status actions.
- **Trace:** the web menu calls `PATCH /api/v1/admin/catalog/:id/status`; the API validates the status,
  requires catalog permission, updates the D1 SKU active state, increments the public catalog cache
  version, and returns the updated status. The catalog page requests inactive rows for authorized
  administrators so paused and archived items remain visible for operational recovery.
- **Local evidence:** API coverage verifies a catalog administrator can pause `sku-apples`; browser
  inspection confirmed the admin catalog retains inactive rows and exposes Edit, Pause, and Delete
  actions. `pnpm check` passed all 55 Turbo tasks, including 79 API unit/runtime tests, both API
  integration suites, 68 web tests, and 53 database tests.

### Completed Storefront Chrome Refinement

- **Status:** locally complete as a user-requested VS-MKT-04 visual and interaction refinement.
  VS-MKT-05 remains the next marketplace slice after this increment is committed and pushed.
- **Outcome:** the shop route uses a Carbon-owned Uber Eats-style utility header with weekly
  Delivery selected, Pickup visibly unavailable, selected-address context, prominent store search,
  server-backed cart count/access, and a desktop navigation rail that defaults expanded and can
  collapse to accessible icon-only controls.
- **References:** use the previously image-inspected Uber Eats web
  [store detail](https://mobbin.com/screens/662abc94-ffdf-494a-b566-3d2970896109),
  [aisle layout](https://mobbin.com/screens/a17b6c78-c6c7-4816-9224-fb5044946114), and mobile
  [store product rows](https://mobbin.com/screens/bce73384-d1e4-4f7d-8c8c-9538c8c66899).
  Fresh Mobbin MCP searches for delivery/address/search/cart chrome returned "Auth required" on
  2026-08-23. The Mobbin login command opened the sign-in page, so connector authorization remains
  pending user sign-in and no uninspected results are being used.
- **Business-rule adaptation:** weekly delivery remains the only active fulfillment mode. Pickup is
  disabled rather than implemented as an unsupported client-only state. Address text comes from
  the selected server address when authenticated; cart count, lines, and subtotal remain
  server-owned.
- **Acceptance checks:** expanded and collapsed desktop rails are keyboard operable and keep named
  icon links; phone retains delivery/address/search/cart chrome and fixed bottom navigation; search
  preserves the server query route; cart access uses the existing persisted cart; public and empty
  address/cart states remain usable; no desktop or phone horizontal overflow or serious
  accessibility violations.
- **Verification evidence:** focused marketplace Playwright runs pass 2/2 on desktop and 2/2 on
  phone, including fulfillment/address/cart chrome, expanded/collapsed navigation, server-backed
  search submission, responsive overflow assertions, and Axe checks. The focused web suite passes
  65/65 tests, including the delivery-address failure fallback, and `pnpm check` passes all 55 Turbo
  tasks.
- **Browser evidence:** local manual comparison at 1920x1080 confirms the desktop canvas fills the
  viewport, the navigation defaults expanded and collapses to icon-only controls, and no horizontal
  document overflow is introduced. The 390x844 view preserves delivery/address/search/cart chrome,
  merchandising, product shelves, and the fixed bottom navigation without horizontal overflow.
- **Request and resilience impact:** `/shop` adds one typed delivery-address request in parallel with
  the existing catalog, plan, subscription, and banner reads. A failed or unavailable address read
  degrades to delivery-area/setup guidance and does not fail catalog rendering; pricing, cart
  totals, availability, roles, and fulfillment rules remain server-owned.
- **Design language alignment:** the Carbon marketplace uses the bundled Google Outfit family,
  neutral Base-inspired ink/muted/surface/border/action tokens, and Carbon green only where it
  carries brand or fulfillment meaning. The Uber Base Color 2.0 reference was inspected at
  https://base.uber.com/6d2425e9f/p/9906f6-color-20.

### Completed Slice: VS-MKT-04

- **Outcome:** authenticated customers can add, remove, and change weekly-cart lines without a
  separate save step; each change is confirmed against current server catalog data and persisted in
  local D1.
- **Reference check:** Mobbin MCP retrieval is now working. The web grocery store-detail flow
  (`92e9ae68-8c98-4d02-ac3f-cf8d8707dae6`), exact Uber Eats mobile checkout flow
  (`4997f6c8-d37e-43f0-9d42-5908c636ea90`), and comparable Instacart mobile cart flow
  (`c9f47ccc-4930-4fd3-a3f8-09ff32c878f7`) were retrieved with image-backed previews on
  2026-08-23. The implementation keeps the compact quantity stepper, persistent cart access, dense
  line review, and phone bottom action.
- **UI decisions:** keep the catalog visible beside a sticky desktop cart; use immediate quantity
  mutations with per-line pending/disabled states; show product image, unit price, line total, and
  substitution preference in cart review; surface server reconciliation as a durable alert; use a
  fixed phone cart action above the existing bottom navigation; retain Carbon tokens, copy, product
  assets, pricing, and weekly checkout rules.
- **Visual refinement:** the desktop shell follows the retrieved web benchmark with a compact
  utility/search header, persistent store-detail rail, neutral selected Shop row, aisle navigation,
  a compact promotion band, and horizontal image-first product sections. The phone shell uses a
  compact green store-search header, horizontal aisle chips, three-across dense product rows,
  persistent cart action, and four-item bottom navigation. Generic ecommerce result counts,
  grid/list controls, the filter/cart column, the circular C mark, and invented Browse/marketing
  copy were removed because they were not supported by the reference. These are Carbon-owned
  adaptations using Carbon products and assets.
- **Refinement references:** the final comparison used the image-backed Uber Eats web screens
  [store detail](https://mobbin.com/screens/662abc94-ffdf-494a-b566-3d2970896109) and
  [aisle/deals layout](https://mobbin.com/screens/a17b6c78-c6c7-4816-9224-fb5044946114), plus the
  mobile [aisle list](https://mobbin.com/screens/f04b5461-97d2-4b21-afa9-65b4270c0e51),
  [store product rows](https://mobbin.com/screens/bce73384-d1e4-4f7d-8c8c-9538c8c66899), and
  [dense category rows](https://mobbin.com/screens/b68f5f88-666b-4f45-819d-f76705d10384).
- **Acceptance checks:** success, validation, customer authorization, stale cart version, changed
  price, unavailable item, quantity limit, retry, empty cart, and D1 persistence are covered; phone
  and desktop layouts have no horizontal overflow and pass keyboard/accessibility checks.
- **Local evidence:** focused contract, D1 repository, API, web utility, and Playwright tests pass;
  phone coverage includes mutation failure/retry, reload persistence, keyboard substitution changes,
  empty-cart persistence, and accessibility; desktop coverage includes responsive cart convergence
  and accessibility. Repository verification passes `pnpm check` with 55/55 Turbo tasks.
- **Viewport refinement evidence:** the rebuilt `/shop` uses the full 1920x1080 viewport with no
  document-level horizontal overflow. The 390x844 phone view also has no document overflow and
  exposes Shop, Aisles, Deals, and My list in the fixed bottom navigation.
- **Store-page merchandising increment:** removed the unsupported merchant-summary block; added a
  sticky grocery category strip with Carbon catalog aisles plus Greens and Leafy vegetables
  shortcuts; added Carbon-owned "Crave it? Get it." and "Featured in fresh markets" merchandising
  banners using catalog imagery, with active `storefront-strip` promotion banners rendered when the
  server provides them; added desktop shelf arrow controls with scroll-aware disabled states and an
  in-place See all/Show less expansion for complete shelves. Prices, availability, cart mutations,
  subscription gates, and banner content remain server-owned.
- **Interaction evidence:** at 1920x1080 the Best sellers rail moved from `scrollLeft=0` to `95`
  after the right-arrow click and enabled the left arrow; See all changed the rail to wrapped,
  visible-all mode. At 390x844 the two merchandising cards, category strip, and fixed bottom
  navigation rendered with `scrollWidth=clientWidth=375`. The merchant-summary copy was absent.
- **Reference transport note:** the recorded image-backed Mobbin links remain the source of truth for
  this refinement. A fresh MCP search during this run returned `Auth required` after the login command,
  so no new reference URLs or assets were added.
- **Non-goals:** address, delivery-window, coupon, quote, payment, and order completion remain
  VS-MKT-06 and VS-MKT-07.

## Completed Slices: VS-MKT-00 through VS-MKT-04

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

Begin VS-MKT-05 locally with subscription onboarding and return-to-shopping flow. Staging
authentication and promotion remain deferred.

## VS-MKT-05 Subscription Onboarding and Return-to-Shopping

- **Status:** locally complete; focused checks and the repository-wide 55-task check pass. Commit
  and push evidence is recorded in the slice handoff.
- **Outcome:** authenticated customers without an active subscription now leave the catalog or
  product detail for a dedicated `/account/subscribe` journey. The local `returnTo` path and query
  are normalized, encoded, and restored after activation; external and protocol-relative targets
  fall back to `/shop`. Account empty state uses the same route instead of a duplicate inline plan
  selector.
- **Mobbin references:** image-backed MCP inspection used Uber Eats web
  [Subscribing to a plan](https://mobbin.com/flows/b2c278e9-6d7d-4be1-b48b-152905a71d01)
  (`679967cd-d71b-4944-ba29-19314c9078ea`, `77c1c831-e7e7-48bf-98bf-23302e5e068c`,
  `30d0b9d1-0ca7-47f5-8061-5961d1254a04`, `877b586a-9772-49cb-b6d4-15ed076cbffb`) and iOS
  [Subscribing to Uber One](https://mobbin.com/flows/e61a0647-babb-4ada-816e-ffddf6657961)
  (`8751dae1-c036-4f22-b25c-fcd81d904798`, `1446a9a8-e320-48ae-8c3b-17a8ed542148`,
  `a5c9e395-4c9e-4600-b7bd-739baefeebab`, `6158a804-b8dc-441f-8604-63760d7ed6b9`,
  `445bf9a9-0708-4128-b6be-56f3336ebf49`). Visible decisions adapted were a dedicated
  membership surface, prominent benefit/plan/price hierarchy, one decisive activation action,
  compact phone plan selection, and an explicit return into shopping. Carbon branding, copy,
  PHP prices, plans, and weekly rules remain original and server-owned.
- **Frontend decisions:** desktop uses a wide two-column benefit and plan composition; phone stacks
  a full-width membership narrative, benefits, plan radio, and primary action rather than shrinking
  the desktop grid. The route includes pending/disabled activation, recoverable error, retry,
  no-plan, already-active, back, and safe-return states. The plan choice exposes radio semantics and
  keyboard operation, and heading hierarchy stays below the `AppShell` page heading.
- **Backend reuse:** no new backend capability or persistence schema was required. The flow reuses
  Better Auth customer guards, `GET /api/v1/plans`, `GET /api/v1/subscription`, and idempotent
  `POST /api/v1/subscription/trial`, plus the existing application subscription service, D1
  repository, migration `0038_subscription_trials.sql`, correlation-aware errors, and typed client.
  The server continues to own plan availability, PHP centavo fee/credit, trial eligibility and
  dates, subscription conflicts, and persisted state.
- **Retry and persistence:** a caller-stable idempotency key is retained across a failed activation
  retry and cleared only after success. Successful activation replaces the route with the saved
  shopping URL; a reload and a later onboarding visit observe the persisted active subscription.
- **Focused evidence:** web Vitest passes 67/67, typecheck and lint pass. Focused Playwright passes
  2/2 on phone and 2/2 on desktop; desktop onboarding is explicitly exercised at 1920x1080. Tests
  cover search-query return preservation, plan fee/credit rendering, keyboard radio selection,
  recoverable 503 retry with the identical idempotency key, successful return, persisted reload,
  already-active fallback, invalid external `returnTo`, empty plan catalog, Axe serious/critical
  violations, and document-level horizontal overflow.
- **Repository gate:** `pnpm check` passes 55/55 Turbo tasks and `git diff --check` passes.
- **Request, latency, and observability impact:** catalog and product-detail pages no longer fetch
  public plans solely to render a duplicate dialog, reducing those server-render reads by one
  request. Onboarding loads account reads in the existing parallel composition and adds only the
  existing trial write on activation. Errors retain API correlation IDs through `ApiClientError`;
  no new logging, metrics, remote resources, or deployment surface was added.
- **Remaining gap and next resume point:** begin VS-MKT-06 with address, delivery-window, coupon,
  quote, and checkout flow.

## VS-MKT-06 Weekly Checkout Review

- **Status:** locally complete; checkout-focused web tests, phone/desktop browser checks, and the
  repository check pass. Commit and push evidence is recorded in the slice handoff.
- **Outcome:** authenticated customers can review saved serviceable addresses, select a delivery
  address and available weekend delivery window, apply or remove a server-validated coupon, and
  inspect server-owned subtotal, discount, delivery fee, weekly fee, credit, overage, and total due
  before the existing idempotent order-lock action. Empty address/window states disable ordering and
  provide an account recovery path.
- **Mobbin references:** image-backed inspection used Uber Eats web
  [Promotions](https://mobbin.com/flows/a11ea1e4-d832-4ef9-b001-e125689f0150), grocery web
  [Store detail](https://mobbin.com/flows/92e9ae68-8c98-4d02-ac3f-cf8d8707dae6), and iOS
  [Checkout](https://mobbin.com/flows/4997f6c8-d37e-43f0-9d42-5908c636ea90) plus
  [View basket grocery](https://mobbin.com/flows/af44648f-8272-49ff-9169-a5d1c4f0f0a1).
  Visible decisions adapted were explicit address and delivery-time sections, touch-sized selection,
  a distinct promo row, grouped quote totals, and a prominent mobile bottom action. Carbon branding,
  prices, weekly rules, and assets remain original.
- **Frontend decisions:** the desktop review uses a dense two-column detail/summary composition with
  a sticky summary; phone uses separate stacked sections and a fixed bottom order action. Native
  buttons expose pressed/disabled state, keyboard selection, focus outlines, pending feedback, retryable
  coupon errors, and no-overflow/Axe checks.
- **Backend reuse and server ownership:** existing typed client methods and protected APIs are reused:
  `GET /api/v1/delivery-address`, `GET /api/v1/delivery-addresses`, `PUT /api/v1/delivery-addresses/:id/select`,
  `GET/PUT /api/v1/delivery-windows`, `GET /api/v1/checkout/quote`, and coupon preview/removal. No
  migration or new production endpoint was required. Address serviceability, window capacity,
  promotion eligibility, all money, quote totals, subscription, cart, and order authorization remain
  server-owned.
- **Fixture and persistence behavior:** deterministic E2E fixtures now cover multiple saved addresses,
  unavailable addresses, multiple/full windows, empty address/window scenarios, `WELCOME` discount
  application, invalid coupon errors, and quote recalculation. Real local persistence remains in the
  existing D1 repositories and API boundaries.
- **Verification evidence:** web Vitest passes 67/67, web lint/typecheck pass, focused Playwright
  checkout tests pass 2/2 on phone and 2/2 on desktop (desktop explicitly resized to 1920x1080), and
  `git diff --check` passes. Coverage includes keyboard address selection, window selection and
  disabled full windows, invalid/valid/remove coupons, server discount rendering, empty-state disabled
  ordering, Axe serious/critical checks, and horizontal overflow.
- **Request, latency, and observability impact:** checkout hydration adds one parallel saved-address
  read; address/window selections and coupon previews are single existing writes/reads. Failed
  optional address reads degrade to an actionable empty state. Existing correlation-aware API errors
  are surfaced without new telemetry or remote dependencies.
- **Remaining gap and next resume point:** local payment-adapter completion, retry, and order
  confirmation are VS-MKT-07. Staging and deployment remain deferred.

## VS-MKT-07 Local Payment Completion

- **Status:** locally complete; the deterministic local provider, checkout charge orchestration,
  retryable order payment action, and confirmation state are implemented and browser-verified.
- **Outcome:** checkout locks the order once with a stable idempotency key, charges the selected saved
  provider reference with a separate stable payment key, preserves the locked order on decline, and
  exposes a retry action. Successful and pending attempts route to the server-backed order detail;
  paid and processing states are durable on reload.
- **Backend reuse:** existing `POST /api/v1/orders`, `POST /api/v1/payments/charge`, payment method
  reads, `DefaultPaymentService`, `FakePaymentProvider`, payment repository ledger, and order payment
  state update path. No migration or duplicate provider contract was added.
- **Frontend decisions:** payment method selection is explicit in checkout; phone retains the sticky
  primary action while desktop keeps a dense review summary. Order detail contains a payment status,
  provider retry controls, and a clear paid/processing confirmation.
- **Verification:** web 67/67, lint/typecheck, focused payment retry Playwright 1/1 phone and 1/1
  desktop, plus the existing order/detail tests. Coverage proves decline recovery, payment retry,
  server-owned amount, idempotent order lock, confirmation routing, no overflow, and Axe checks.
- **Remaining gap and next resume point:** permission-scoped admin catalog operations are VS-MKT-08.

## VS-MKT-08 Permission-Scoped Catalog Operations

- **Status:** locally complete. Catalog/pricing administrators get a server-backed read workspace;
  only superadmins receive the launch-configuration action, matching the API guard.
- **Backend reuse:** the existing atomic `PUT /api/v1/admin/launch-configuration`, shared strict
  contract, launch service, D1 transaction, audit event, server price calculation, idempotency, and
  superadmin authorization remain the sole catalog write boundary. No new endpoint or migration.
- **Frontend and states:** catalog counts, category, unit, price, and active state remain server reads;
  capability copy distinguishes read-only users. The manifest form handles JSON/contract errors,
  pending state, retry-key replay, and successful counts without hydration mismatch.
- **Verification:** focused superadmin manifest Playwright passes on phone and desktop with Axe and
  no-overflow checks; web lint/typecheck and repository checks pass. VS-MKT-09 is next.

## VS-MKT-09 Weekly Operations

- **Status:** locally complete using the existing permission-protected procurement, packing, and
  dispatch APIs and repositories.
- **Outcome:** administrators can record purchases and shortages, propose substitutions, update
  packing manifests, and assign paid packed orders to delivery staff/windows. Forms now have explicit
  accessible labels and pending/server-error feedback.
- **Backend reuse:** current-cycle assignment, order/payment/packing prerequisites, repository
  persistence, audit events, and permission guards remain server-owned. No new migration or endpoint.
- **Verification:** focused phone and desktop Playwright covers purchase, shortage, packed manifest,
  dispatch assignment, Axe, and overflow; full checks pass. VS-MKT-10 is next.

## VS-MKT-10 Customer Substitutions And Support

- **Status:** locally complete. Customers can accept or reject procurement substitutions from the
  account route, create general support cases, and submit cancellation or refund requests against a
  server-returned order from `/account/support`.
- **Outcome and responsive UI:** the existing customer account and support workspaces now have a
  deterministic end-to-end path through populated order and substitution data. Phone and desktop
  layouts preserve the account navigation, readable request history, touch-sized actions, sticky
  desktop request column, pending controls, success announcements, and actionable empty states.
  Shared input, select, and textarea components now generate stable IDs when callers omit one, so
  every visible label remains programmatically associated with its control.
- **Backend reuse:** the existing customer-substitution, customer-order-request, and support-case
  contracts, typed API methods, Better Auth customer ownership, permission-protected admin decision
  flows, idempotency behavior, D1 repositories, and correlation-aware errors remain authoritative.
  Cancellation/refund eligibility, substitution ownership and state, request status, and support
  status are not inferred by the client. No endpoint, repository, migration, or parallel model was
  added.
- **Persistence, retry, and authorization:** substitution decisions use the existing deterministic
  decision idempotency key; support and order requests use request idempotency keys and persist through
  their current repositories. Buttons disable during writes, recoverable errors remain visible, and
  protected routes continue to require the active customer session. Existing API coverage proves
  customer ownership, permission scope, replay, validation, and persisted decision behavior.
- **Mobbin references:** the previously image-inspected mobile
  [Account](https://mobbin.com/flows/87df6ee3-3fb5-41aa-8a31-eae7b22fea53) flow remains the bounded
  reference for compact account navigation and request-entry hierarchy. `codex mcp login mobbin`
  completed successfully on 2026-08-23, but subsequent connector searches still returned
  `Auth required`; no uninspected screens or invented reference details were used.
- **Verification and impact:** web lint, typecheck, and all 67 web tests pass. Focused Playwright passes
  1/1 on phone and 1/1 on desktop for accepting a substitution, creating a support case, submitting a
  refund request, serious/critical Axe checks, and document-overflow checks. The slice adds only the
  existing mutation requests selected by the customer and refreshes server-rendered account data after
  creation; it adds no polling, fan-out, runtime dependency, or new observability boundary.
- **Next resume point:** begin VS-MKT-11 delivery-staff execution and customer tracking only after this
  slice is committed, pushed, and the working tree is clean.

## VS-MKT-11 Delivery Execution And Customer Tracking

- **Status:** locally complete. Delivery staff can record the next server-approved stop event through
  the existing offline-capable queue and Sync route; customer-owned order detail exposes the resulting
  delivery timeline, signed proof-of-delivery link, and support entry point.
- **Outcome and responsive UI:** assignment detail retains recipient/contact/address/map context,
  next-event controls, failure-reason validation, proof-photo affordance, and explicit queued/sync
  states. The customer order detail keeps a dense desktop receipt beside the timeline and a readable
  single-column phone composition. The workflow was verified at phone and desktop sizes without
  document overflow.
- **Backend reuse:** existing deliveryman assignment/event contracts and D1 repositories enforce the
  active deliveryman session, assignment ownership, valid event transitions, idempotent client event
  replay, and server timestamps. Existing customer tracking/media contracts and repositories enforce
  customer ownership and signed media URLs. No endpoint, migration, repository, or parallel model was
  added.
- **Persistence and offline behavior:** recording an event writes to the existing IndexedDB queue;
  `/deliveryman/sync` flushes pending events when online and removes them only after API confirmation.
  The local fixture now models stateful event replay and customer tracking/media responses so the
  cross-role browser trace is deterministic. The server remains authoritative for assignment status,
  event acceptance, and proof metadata.
- **Mobbin references:** the previously image-inspected mobile
  [Ongoing delivery](https://mobbin.com/flows/5e1230df-8b95-4cc1-a3e9-790553e3f78c) flow remains the
  bounded reference for compact tracking hierarchy and status progression. `codex mcp login mobbin`
  completed successfully on 2026-08-23, but later connector searches still returned `Auth required`;
  no uninspected screens or invented reference details were used.
- **Verification and impact:** focused Playwright passes 1/1 on phone and 1/1 on desktop for driver
  event capture, Sync confirmation, customer delivered state, proof link, support entry, Axe, and
  overflow. Existing API, contracts, domain, storage, and delivery queue tests retain authorization,
  transition, replay, signed-media, and offline persistence coverage. Runtime impact is limited to the
  existing event and tracking requests; no polling, dependency, or new observability boundary was
  introduced.
- **Known gap:** live ETA/location and courier identity are intentionally deferred because the current
  Carbon tracking contract exposes event progression and proof media only. The customer can still
  contact support and inspect the server-confirmed delivery window and event timeline.
- **Next resume point:** begin VS-MKT-12 account parity, reorder, favorites, saved items, and retention.

## VS-MKT-12 Account Parity, Reorder, Saved Items, And Retention

- **Status:** locally complete. Customers can save active catalog items, remove them from a
  customer-owned list, reorder prior order lines into the server-validated cart, and persist
  notification preferences across reloads.
- **Backend trace:** shared `saved-items.ts` schemas feed protected `GET /api/v1/saved-items`,
  `PUT /api/v1/saved-items/:skuId`, and `DELETE /api/v1/saved-items/:skuId` routes. The new
  `customer_saved_items` D1 table and repository keep only customer/SKU/timestamp state; current
  names, images, prices, and availability are resolved from the existing catalog reader. Reorder
  sends only SKU identifiers and quantities through the existing `PUT /api/v1/cart` contract, so
  the server re-resolves current prices, availability, and limits. Notification preferences reuse
  the existing repository and API boundary.
- **Responsive UI:** product detail adds a save-for-later action; `/account/saved` uses a compact
  responsive item grid with image, current price, unit, empty, pending, and removal states. Order
  history and detail expose a reorder action with pending, server-adjustment, and error feedback.
  Customer navigation includes Saved items while existing account and mobile navigation remain
  role-scoped.
- **Mobbin references and limitation:** the previously image-inspected account flow
  [Account](https://mobbin.com/flows/87df6ee3-3fb5-41aa-8a31-eae7b22fea53) remains the bounded
  reference for account hierarchy and retention entry points. `codex mcp login mobbin` completed
  successfully on 2026-08-23, but subsequent retrieval returned `Auth required`; no uninspected
  screens or proprietary assets were used.
- **Acceptance and authorization:** unauthenticated and non-customer sessions are rejected by the
  protected routes; unavailable SKUs cannot be saved; duplicate save replay is idempotent; removal
  is customer-scoped; stale/changed cart and server-owned price reconciliation remain handled by the
  existing cart contract. Empty saved state and preference persistence are covered.
- **Verification evidence:** contracts, D1 repository, API, web client, and navigation tests pass;
  focused Playwright passes 1/1 on phone and 1/1 on desktop for save/remove/reorder, notification
  preference persistence, Axe, and overflow. `pnpm check` passes all 55 Turbo tasks, including web
  68/68, API 85/85 unit/integration, DB 53/53, and contracts 33/33 tests.
- **Request and observability impact:** account hydration adds one bounded saved-items read in its
  existing parallel request fan-out. Save/remove add one private no-store mutation/read response;
  reorder reuses the existing cart request. No polling, new dependency, queue, or observability
  boundary was introduced.
- **Known gap:** saved items are intentionally a single persisted SKU list rather than separate
  favorites and wishlists; live inventory reservations and recommendations remain outside the
  current contracts.
- **Next resume point:** VS-MKT-13 responsive, accessibility, performance, and workflow hardening.

### VS-MKT-13 Responsive, Accessibility, Performance, And Workflow Hardening

- **Local UI refinement:** the marketplace desktop shell now opens an account drawer from the
  top-left account control, replacing sidebar collapse/expand behavior. The desktop rail is now
  category-first (`Home`, `Grocery`, `Vegetables`, live catalog categories, and `Promo`), with the
  promotions anchor wired to the featured-offers section. Focused marketplace Playwright passes
  on phone, tablet, and desktop; `pnpm check` passes all workspace checks. Commit `6a062ee` is
  pushed to `origin/main`. The remaining unstaged files are unrelated pre-existing fixture,
  generated typing, Playwright, and asset changes.

- **Featured-promotion visual refinement:** the empty-banner fallback on `/shop` is now a five-slide,
  manually controlled campaign carousel with oversized HTML copy, previous/next controls, and five
  direct-select indicators. Phone and tablet layouts show one centered campaign, while desktop
  presents two compact cards side by side so the centered people and boxes are not stretched toward
  the outer edge. The first-order artwork replaces the former mascot and shopping bags
  with a sturdy produce delivery box, and the former welcome/eligibility paragraph is removed. Four
  additional original, text-free box campaigns cover build-your-own selection, weekly market
  freshness, weekend delivery, and the membership trial. All five ImageGen cutouts are optimized
  1024-by-1024 transparent WebPs under `apps/web/public/marketplace`; active server-returned
  promotion banners still take precedence. Live local browser review covers all five desktop slides
  plus the 390-by-844 phone composition. Focused marketplace Playwright passes 3/3 across phone,
  tablet, and desktop with all five selector/asset assertions, serious/critical Axe checks, and
  overflow checks; `pnpm check` passes all 55 Turbo tasks. The change adds no request, persistence,
  latency, runtime dependency, or observability boundary.

- **Marketplace search simplification:** the duplicate in-content `Crave it? Get it.` heading and
  secondary search form are removed from `/shop`, so category filters and the featured campaign now
  follow the shared marketplace header directly. The responsive header search remains the single
  server-backed search entry point. Focused marketplace Playwright passes 3/3 across phone, tablet,
  and desktop with explicit removed-content and visible-header-search assertions, Axe checks, and
  overflow checks; `pnpm check` passes all 55 Turbo tasks. No API, persistence, latency, or
  observability boundary changed.

- **Status:** locally complete. The local browser audit hardened storefront CTA contrast, corrected
  the protected-route expectation for the intentionally public `/shop` route, added deterministic
  guest responses for optional cart/subscription reads, and refreshed six responsive visual
  baselines after the accumulated marketplace shell changes.
- **Accessibility evidence:** primary buttons now use the high-contrast action token with white
  text. Selected delivery-window helper text uses the ink token on the accent background, resolving
  the prior 3.42:1 serious Axe violation. Focused save/reorder flows pass on phone, tablet, and
  desktop with Axe and overflow checks.
- **Verification evidence:** the initial full local E2E audit completed 59/72 tests and exposed the
  delivery-window contrast defect plus existing fixture/timing and snapshot drift. After the fix,
  the save/reorder flow passes 3/3 across phone, tablet, and desktop; the phone/desktop responsive
  accessibility workflow passes 8/8; and `pnpm check` passes all 55 Turbo tasks.
- **Performance impact:** no new runtime dependency, polling, queue, or remote request was added.
  Existing bounded parallel marketplace reads remain unchanged.
- **Mobbin limitation:** `codex mcp login mobbin` completed successfully on 2026-08-23, but fresh
  retrieval still returned `Auth required`; only previously image-inspected references were used.
- **Known gaps:** checkout payment-state fixture instability, delivery offline timing, marketplace
  address hydration timing, and broader full-suite state isolation remain explicit follow-up work.
- **Next resume point:** do not begin VS-MKT-14 or staging/deployment work until explicitly
  requested.

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
  and the server-validated cart API.
- Authenticated cart mutations are persisted immediately, reject stale versions, reconcile changed
  prices and unavailable items, retain substitution preferences, and restore server truth after
  failures or reloads.

## Known Marketplace Gaps

- The current catalog is flat; store identity, aisle hierarchy, store media, recommendations,
  promotions, service-area context, and delivery estimates need explicit contracts.
- Related items, limits, availability explanation, and substitution preferences are missing from
  product detail.
- Facets, analytics, and richer server merchandising remain future work; the core query, sorting,
  price bounds, and cursor pagination are server-owned.
- Minimum-order, fee, and checkout-specific cart rules remain part of checkout composition rather
  than the completed continuous-cart slice.
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
