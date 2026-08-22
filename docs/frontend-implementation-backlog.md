# Frontend Implementation Backlog

This is the delivery plan for the Carbon Food Delivery web application in `apps/web`.
It covers the public landing page, customer food-delivery experience, admin operations console,
and delivery staff mobile workflow. The existing `docs/implementation-backlog.md` remains the
platform/API ledger; this file is its frontend companion.

## Working Rules

- Follow [`docs/frontend-standards.md`](frontend-standards.md) for component ownership, reuse,
  Tailwind, token, accessibility, and route-composition decisions.
- Work directly on `main`; keep each slice independently reviewable.
- Before starting a slice, mark it `in progress` and record scope and acceptance checks.
- Update this backlog in the same commit as the implementation that completes a slice.
- Run focused checks and the repository-mandated `pnpm check` before completion.
- Preserve domain/application/contracts boundaries. The frontend consumes server-owned values and
  never becomes a second business-rules implementation.
- Keep route files thin. Put reusable UI in `components`, feature behavior in `features`, and
  transport/session/permission concerns in `lib`.
- Prefer readable named functions and small modules over clever generic abstractions.
- Use semantic HTML, keyboard-accessible controls, and WCAG 2.2 AA targets.
- Build and refactor the complete UI first. Defer the Playwright harness and cross-role browser E2E
  suite to FE-011; continue focused tests, builds, and `pnpm check` for every preceding slice.

## Implemented Baseline To Preserve

This frontend plan starts from an implemented, API-connected product rather than a greenfield UI.
Future slices must inspect and preserve the existing behavior instead of interpreting the backlog as
a request to recreate backend or integration work.

Already implemented:

- the Hono Cloudflare API, D1 persistence boundaries, application services, and domain rules;
- Better Auth session handling plus server-owned customer, deliveryman, admin, and superadmin
  authorization behavior;
- shared Zod contracts in `@carbon/contracts` and the correlation-aware API error envelope;
- a typed web API client covering the main customer, admin, and delivery workflows;
- API-backed public, customer account, admin console, and delivery console pages;
- backend unit and D1 integration coverage for authentication, authorization, idempotency,
  persistence, and server-resolved commerce values.

The remaining frontend slices primarily reorganize existing connected behavior into maintainable
layouts, feature modules, and routes; complete missing presentation and interaction states; and
deliver the intended responsive visual design. They may add a typed client method when an existing
server endpoint is not yet exposed, but must not invent parallel endpoints, DTOs, roles, prices, or
business rules.

## Validated Stack Decision

The current screens are placeholders and the existing styling is one global CSS layer. Adopting
Tailwind now is sound because it avoids preserving a styling system that has not yet become a
product contract. `E:\grocery\web` is a visual reference only; its Bootstrap, jQuery, and
template CSS/JavaScript should not be copied into this Next.js application.

### Application

- Keep Next.js 16 App Router, React 19, TypeScript, and Cloudflare OpenNext.
- Keep `@carbon/contracts` and the existing typed API client as the API contract source.
- Use Server Components for initial reads and protected route decisions.
- Use Client Components only for interaction, polling, offline sync, and browser APIs.

### Styling and UI

- Tailwind CSS is the primary styling system.
- CSS custom properties define semantic design tokens consumed by Tailwind utilities.
- Use `clsx` and a small `cn` helper; use `class-variance-authority` only where variants
  remove real duplication.
- Use Radix primitives selectively for dialogs, menus, popovers, tabs, and tooltips. Wrap them in
  local `components/ui` components so feature code does not depend on Radix details.
- Use Lucide icons for interface actions.
- Do not add Bootstrap, styled-components, or a parallel design system.

### Data, forms, and testing

- Use existing API transport and shared Zod contracts; do not duplicate DTOs in the web app.
- Use TanStack Query only for client caching, invalidation, polling, or mutations that need it.
- Use React Hook Form plus shared Zod schemas for complex forms.
- Use IndexedDB through `idb` for the delivery event queue.
- Use Vitest for utilities/components and Playwright for cross-role, responsive, and visual checks.

## Target Routes and Role Model

Use route groups with explicit role layouts:

```text
src/app/
├── (public)/page.tsx                         /
├── (customer)/account/
│   ├── page.tsx                              /account
│   ├── catalog/page.tsx                      /account/catalog
│   ├── cart/page.tsx                         /account/cart
│   ├── checkout/page.tsx                     /account/checkout
│   ├── orders/page.tsx                       /account/orders
│   ├── orders/[orderId]/page.tsx             /account/orders/:orderId
│   └── support/page.tsx                      /account/support
├── (operations)/admin/
│   ├── page.tsx                              /admin
│   ├── catalog/page.tsx                      /admin/catalog
│   ├── orders/page.tsx                       /admin/orders
│   ├── procurement/page.tsx                  /admin/procurement
│   ├── packing/page.tsx                      /admin/packing
│   ├── dispatch/page.tsx                     /admin/dispatch
│   ├── support/page.tsx                      /admin/support
│   ├── reporting/page.tsx                    /admin/reporting
│   └── staff/page.tsx                        /admin/staff
└── (operations)/deliveryman/
    ├── page.tsx                              /deliveryman
    ├── assignments/page.tsx                  /deliveryman/assignments
    ├── assignments/[id]/page.tsx             /deliveryman/assignments/:id
    ├── route/page.tsx                        /deliveryman/route
    ├── sync/page.tsx                         /deliveryman/sync
    └── history/page.tsx                      /deliveryman/history
```

The server owns role and permission decisions. The UI may hide unavailable navigation items, but
every protected page and mutation must enforce authorization on the server. `superadmin`
inherits applicable admin capabilities. Missing sessions redirect to sign-in; authenticated
users without a required role receive a consistent forbidden state.

## Modular Source Shape

```text
apps/web/src/
├── app/                 route composition and loading/error boundaries
├── components/
│   ├── ui/              buttons, fields, dialogs, tables, badges, skeletons
│   ├── layout/          public/customer/admin/delivery shells and navigation
│   └── feedback/        empty, error, unauthorized, offline, and toast states
├── features/            landing, catalog, cart, checkout, orders, admin, delivery
├── lib/
│   ├── api/             typed transport and query helpers
│   ├── auth/            session loading and route guards
│   ├── permissions/     centralized role/capability predicates
│   └── formatting/      money, dates, status labels, display utilities
└── styles/              Tailwind entrypoint, tokens, minimal global rules
```

Feature modules expose a small public surface. Presentational components receive typed props;
loaders and mutations stay in route loaders or feature hooks. Do not import a feature's internals
from another feature.

## Slice Ledger

| Slice  | Area                                               | Status   | Depends on           |
| ------ | -------------------------------------------------- | -------- | -------------------- |
| FE-001 | Tailwind baseline and CSS migration                | complete | `da3e311` -> current |
| FE-002 | Tokens and accessible UI primitives                | complete | `b0b575a` -> current |
| FE-003 | Shared shells, session states, and RBAC navigation | complete | FE-002 -> FE-004     |
| FE-004 | Public landing page                                | complete | FE-003 -> FE-005     |
| FE-005 | Customer catalog and mobile shopping               | complete | FE-004 -> FE-006     |
| FE-006 | Cart, subscription, and checkout                   | complete | FE-005 -> FE-007     |
| FE-007 | Customer account, orders, tracking, and support    | complete | FE-006 -> FE-008     |
| FE-008 | Admin overview and operations navigation           | complete | FE-003 -> FE-009     |
| FE-009 | Admin operational workspaces                       | complete | FE-008 -> FE-010     |
| FE-010 | Delivery dashboard and mobile PWA workflow         | complete | FE-003 -> FE-011     |
| FE-011 | Browser E2E, responsive, accessibility, visual QA  | complete | FE-004 -> FE-012     |
| FE-012 | Frontend release hardening and handoff             | complete | FE-011               |
| FE-013 | Marketplace destination, hydration, and free trial | complete | FE-005 -> FE-014     |
| FE-014 | Public storefront product and visual completion    | complete | FE-013 -> FE-015     |
| FE-015 | Admin catalog, orders, and staff product surfaces  | planned  | FE-014               |

## Slice Details

### FE-001: Tailwind baseline and CSS migration

Add the supported Tailwind integration for Next.js 16/OpenNext, Tailwind entrypoint/source
configuration, semantic token CSS, and a small `cn` helper. Incrementally migrate the current
placeholder landing, account, admin, and delivery screens so the old page-wide styling dependency
can be removed without behavior changes.

Acceptance: web build, lint, typecheck, and tests pass; no Bootstrap/jQuery/template assets are
added; current API behavior is preserved; mobile/desktop layouts have visible keyboard focus.

### FE-002: Tokens and accessible UI primitives

Define surface, text, muted, border, action, success, warning, danger, and delivery-status tokens.
Add typed `Button`, `LinkButton`, `Input`, `Select`, `Textarea`, `Badge`, `Card`,
`Table`, `Dialog`, `Sheet`, `Tabs`, `EmptyState`, `ErrorState`, `Skeleton`, and
`StatusPill` primitives. Test default, hover, focus-visible, disabled, loading, error, and
selected states.

Completion record: added a typed UI foundation under `apps/web/src/components/ui` with one public
barrel export. The modules provide class composition, button/link variants, labeled form controls,
badges and status pills, cards, semantic tables, feedback states, native dialog/sheet behavior, and
keyboard-usable tabs. Status formatting remains in pure helpers for straightforward tests.
Tailwind semantic tokens now include success, warning, and danger colors. No route behavior or API
contract changed. Focused web lint, typecheck, 26 tests, and production build pass.

### FE-003: Shared shells, session states, and RBAC navigation

Refactor the existing API-connected public, customer, admin, and delivery routes into layouts with
shared headers, responsive containers, desktop sidebar, mobile navigation, breadcrumbs, and account
menu. Centralize `requireSession`, `requireRole`, and `can(permission)` around the existing session
contract and Better Auth flow. Derive admin navigation from server-provided permissions. Add
route-level loading, error, unauthorized, forbidden, and offline states. Do not replace the current
authentication routes, session transport, API client, or connected workflow components.

Acceptance: wrong-role access is blocked; superadmin inheritance works; navigation has no horizontal
overflow; guard and navigation tests cover missing session, wrong role, and missing permission.

### FE-004: Public landing page

Redesign the existing `/` experience around its server-owned storefront banners, plans, catalog
preview, session state, and authentication controls. Use Figma and `E:\grocery\web` for visual
direction only. Include accessible navigation, hero, value proposition, plans, catalog preview,
account calls to action, footer/legal links, image loading, alt text, and empty/error states.

### FE-005: Customer catalog and mobile shopping

Expand the existing catalog and cart integration into a mobile-first shopping experience with
category filters, search, product cards, availability, quantity controls, and cart summary. Keep
prices and availability typed and server-backed. Add loading, empty, error, retry, and URL-filter
states.

### FE-006: Cart, subscription, and checkout

Refactor and complete the existing connected cart editing, plan selection, address/window
selection, payment, review, and confirmation workflows as focused feature modules and routes. Use
React Hook Form/Zod where forms are complex enough to benefit. Show server totals, fees, credits,
cutoffs, and payment states. Preserve the current idempotency and correlation-aware error behavior.

Current increment:

- Add focused cart and checkout routes backed by the existing customer APIs and contracts.
- Move subscription, delivery address/window, coupon, review, and order confirmation behavior into
  feature-owned modules while keeping route files limited to guards, data loading, and composition.
- Show server-confirmed totals and readiness blockers without calculating commerce values in the
  browser.
- Cover checkout readiness, cart presentation, and idempotent order submission with focused tests.

Completion record: the protected customer flow now has focused `/account/cart` and
`/account/checkout` routes. Feature-owned modules handle cart editing, delivery-window selection,
coupon preview/removal, payment-method readiness, server quote presentation, and idempotent order
locking. The browser submits only SKU quantities, a delivery-window identifier, an optional coupon
code, and an idempotency key; prices, fees, credits, availability, eligibility, and final totals
remain server-owned. Provider payment setup remains intentionally hosted/provider-tokenized rather
than collecting raw payment credentials in the application.

### FE-007: Customer account, orders, tracking, and support

Split the existing API-connected account page and its components into account, order
history/detail, tracking, receipts, privacy, notification, and support feature modules and routes.
Preserve their current mutations and server ownership checks. Add fulfillment/delivery timelines
plus loading, not-found, unauthorized, empty-history, and submission states.

Current increment:

- Add dedicated customer order history, order detail, tracking, receipt, proof-media, and support
  routes using the existing protected API client and shared contracts.
- Resolve order ownership before requesting tracking or media, and preserve idempotent support and
  order-request mutations.
- Cover customer-owned detail hydration, missing-order behavior, empty history, and support states.

Completion record: customer navigation now includes dedicated order history, order detail, and
support routes. Order detail resolves the customer-owned order before loading tracking or signed
proof media, then presents immutable delivery events and server-confirmed receipt totals. The
support workspace preserves both general cases and idempotent cancellation/refund requests without
duplicating backend ownership rules. Empty history, not-found, loading/error boundary inheritance,
responsive tables/cards, and keyboard-focus states use the shared UI and shell layers.

### FE-008: Admin overview and operations navigation

Decompose the existing API-connected single-page admin console into an operations shell and
dashboard overview without losing its working actions: KPI cards, cycle summary,
outbox/delivery/procurement alerts, recent activity, and permission-aware quick actions. Use dense
desktop comparison and prioritized mobile summaries.

Current increment:

- Move the weekly operations summary into an admin-owned feature module with KPI cards, prioritized
  alerts, recent audit activity, and permission-aware workflow links.
- Keep the existing connected operational actions available while FE-009 splits them into dedicated
  workspaces.
- Centralize readable admin navigation definitions and cover permission filtering in focused tests.

Completion record: the protected `/admin` route now composes a focused admin overview feature with
server-derived KPI cards, operational alerts, cycle activity, recent audit activity, and
permission-filtered workspace links. Existing server-owned dashboard reads and role guards remain
unchanged. Focused web tests, lint, typecheck, production build, and the full repository checks
pass. The next increment separates the operational workspaces into dedicated routes.

### FE-009: Admin operational workspaces

Move the existing admin procurement, packing, dispatch, support, reporting, promotions, audit,
refund, order-request, and configuration integrations into separate feature modules and routes;
complete catalog/pricing and staff surfaces against implemented contracts and endpoints. Use
responsive tables, drawers/dialogs for focused edits, explicit destructive-action confirmation,
server validation, and permission-aware controls.

Current increment:

- Add protected procurement, packing, dispatch, support, promotions, reporting, and configuration
  routes around the existing server-backed admin actions.
- Keep each route responsible for one operational concern while preserving server-owned permissions,
  validation, idempotency, and status transitions.
- Cover workspace navigation and the production web build before continuing to delivery staff.

Completion record: the admin console now exposes dedicated permission-protected procurement,
packing, dispatch, support, promotions, reporting, and configuration routes. Shared workspace
composition keeps server-derived dashboard data, role guards, idempotent actions, and launch
configuration in one readable feature boundary, while route files remain thin. Existing connected
operational controls were moved under the feature module without adding unimplemented backend
contracts. Focused web tests, lint, typecheck, and production build pass; the full repository check
is the final pre-commit verification for this slice. The next increment is the delivery dashboard
and mobile PWA workflow.

### FE-010: Delivery dashboard and mobile PWA workflow

Refactor the existing API-connected delivery console into a touch-first delivery shell with
assignment queue/detail, route view, proof-of-delivery, failure reasons, history, and sync status.
Preserve assignment scoping, idempotent event submission, and server-issued media URLs. Add the
IndexedDB-backed ordered event queue, retry/conflict messaging, online/offline banners, and a useful
desktop view.

Current increment:

- Split the connected delivery console into dashboard, assignment queue/detail, route, sync, and
  current-cycle history routes with feature-owned presentation and workflow modules.
- Replace the local-storage event queue with an ordered IndexedDB queue that preserves stable client
  event IDs, retries transient failures, and retains actionable conflict details.
- Keep proof uploads on server-issued URLs and expose explicit online, offline, pending, syncing,
  conflict, empty, disabled, and success states on touch-first controls.
- Add installable PWA metadata and focused tests for event progression, route ordering, queue state,
  and delivery navigation.

Acceptance checks:

- Route files contain guards, server reads, and composition rather than reusable workflow logic.
- The browser queues only contract-valid delivery events; assignment, order, and deliveryman scope
  continue to be verified by the protected API.
- Events flush in queued order, reuse their original client event IDs, stop on transient failures,
  and retain rejected events for staff review instead of silently deleting them.
- Proof uploads accept only the shared bounded image types and use the server-issued upload URL.
- Phone controls meet touch and keyboard needs, desktop layouts remain useful, and focused web
  checks, the production build, and `pnpm check` pass.

Completion record: the delivery workflow now lives under a focused `features/delivery` boundary and
has protected dashboard, assignment queue/detail, route, sync, and history routes. Delivery events
are stored in an ordered IndexedDB queue with stable client event IDs, online retry, retained
conflicts, explicit retry/removal controls, and no client-owned assignment or deliveryman scope.
Proof uploads remain bounded to the shared image contract and use server-issued upload URLs. A
Next.js manifest and delivery icon make the delivery surface installable. Focused delivery and
navigation tests, lint, typecheck, production build, and practical 390 px/1440 px browser checks
pass; the local browser correctly rendered the session-unavailable guard without horizontal
overflow when the API Worker was not running. The next slice is FE-011 browser E2E and formal
cross-role responsive/accessibility/visual QA.

### FE-011: Browser E2E, responsive, accessibility, and visual QA

After FE-004 through FE-010 have completed the planned UI, add the Playwright harness and coverage
for public, customer, admin, and delivery journeys at phone, tablet, and desktop widths. Add visual
checkpoints for shared shells, landing, checkout, admin overview, and delivery detail. Check
authentication and wrong-role access, keyboard navigation, reduced motion, offline states,
contrast, connected API behavior, and OpenNext preview behavior.

Current increment:

- Add a Playwright harness with deterministic contract-shaped API fixtures for public, customer,
  administrator, and delivery roles without production credentials.
- Cover authentication and wrong-role guards, phone/tablet/desktop overflow, keyboard navigation,
  reduced motion, delivery offline sync, and serious/critical accessibility violations.
- Record stable visual checkpoints for the storefront, checkout, admin overview, and delivery
  assignment detail.
- Keep browser fixtures test-only and route all application reads and mutations through the normal
  typed web transport and shared contract validation.

Acceptance checks:

- Protected route decisions still happen in Server Components from the fixture-provided session
  contract; tests do not bypass `requireRole`, `requirePermission`, or the web API proxy.
- Role fixtures cannot open another role's protected surface and unauthenticated access retains the
  existing signed-out/unauthorized behavior.
- Target pages have no horizontal overflow at phone, tablet, or desktop widths and their primary
  controls are reachable by keyboard with visible focus.
- Axe reports no serious or critical violations on the selected cross-role pages, reduced-motion
  preferences disable smooth scrolling/animation, and delivery events remain queued while offline.
- Visual checkpoints, the OpenNext preview smoke test, focused Playwright runs, production build,
  and `pnpm check` pass.

Completion record: the Playwright harness now runs deterministic contract-shaped API fixtures
through the normal web transport and covers storefront, checkout, admin overview, delivery detail,
authorization guards, keyboard focus, reduced motion, IndexedDB offline persistence, manifest
availability, and serious/critical Axe violations at phone, tablet, and desktop sizes. Visual
snapshots are committed for checkout, admin overview, and delivery detail on phone and desktop.
The focused Playwright suite passes all 24 tests, and the production Next build plus repository
checks remain green. OpenNext preview was attempted; its Windows bundle phase fails on the known
`EPERM` symlink limitation documented by OpenNext, so the final preview smoke test must run in the
Linux/WSL release environment. The next slice is FE-012 frontend release hardening and handoff.

### FE-012: Frontend release hardening and handoff

Document environment/configuration, runtime error hooks, caching/loading guidance, and module
conventions. Verify auth cookies, API origin, CSP/security headers, image domains, and Cloudflare
bindings in staging/production builds. Record test roles, rollback notes, known gaps, and resume
point.

Completion record: added a named Content Security Policy alongside the existing transport and
framing headers, plus a global App Router error boundary that reuses the shared retry state. Added
[`docs/runbooks/frontend-release-handoff.md`](runbooks/frontend-release-handoff.md) with the real
Wrangler bindings, same-origin Better Auth cookie flow, API origin ownership, staging/production
smoke checks, caching expectations, test roles, rollback notes, third-party image/payment policy,
and the known Windows OpenNext symlink limitation. The web configuration test now guards the CSP
contract. Repository checks and the focused browser suite pass; the Linux/WSL OpenNext preview
remains a release-environment check.

### FE-013: Marketplace destination, faster hydration, and trial activation

The customer shopping surface is now the protected `/shop` marketplace. Successful customer sign-in
and sign-up redirect there, while `/account` remains the profile, subscription, support, and order
history workspace. The legacy `/account/catalog` path redirects for compatibility.

Public storefront reads use a short server cache, checkout loads only its required resources in
parallel, and the web API client returns `429` responses immediately instead of sleeping for five
seconds and retrying. The landing hero fallback is requested as a smaller WebP image.

Customers without a subscription can activate one server-owned one-calendar-month free trial for an
active plan. Trial dates and one-time eligibility are persisted in D1, every activation requires an
idempotency key, and recurring billing skips charges while the trial is active. The browser never
sends prices, trial dates, or billing status.

Acceptance checks: focused web/API/domain/application/DB tests, `pnpm check`, Playwright smoke tests,
the API migration, and staging smoke tests all pass. Resume point: monitor staging marketplace and
trial activation timings, then tune cache revalidation from observed data.

### FE-014: Public storefront product and visual completion

Finish the public landing page as the customer-facing grocery storefront rather than a functional
content outline. Preserve the existing server-owned banner, plan, catalog, and session reads while
adding a strong commerce hierarchy, useful category discovery, trial messaging, delivery/value
proof, and a complete responsive footer. Use purposeful optimized Unsplash imagery for the hero and
supporting sections while ImageGen is unavailable; the `E:\grocery\web` template remains a structure
and density reference only.

Keep each major section in a focused storefront module. The route remains responsible only for
parallel server reads and composition. Static marketing copy must not introduce prices, delivery
coverage, availability, or operational promises that conflict with server configuration.

Acceptance checks:

- The first viewport clearly identifies Carbon Food Delivery and shows real grocery imagery on
  phone and desktop without depending on a configured promotional banner.
- Plans, catalog items, authentication, and customer destinations remain API/session-backed.
- Empty catalog and unavailable storefront data still produce useful, visually complete states.
- The page has no horizontal overflow, serious/critical Axe violations, or incoherent overlap at
  phone, tablet, and desktop sizes.
- Focused tests, storefront visual snapshots, production build, `pnpm check`, staging deployment,
  and desktop/mobile staging smoke checks pass.

Completion record: the public route is now a modular commerce-first storefront composed from focused
hero, benefits, catalog, process, plans, trial, and footer modules. It preserves server-backed
banner, session, catalog, and plan data; sends authenticated customers to `/shop`; provides useful
empty and unavailable states; and includes responsive navigation, accessible imagery, trial messaging,
and a complete footer. The approved interim imagery uses optimized Unsplash WebP URLs. ImageGen is
optional under the frontend guardrails; exact replacement paths and prompts are recorded in
[`docs/runbooks/storefront-imagery-handoff.md`](runbooks/storefront-imagery-handoff.md). Focused web
tests, lint, typecheck, production build, the 24-test Playwright suite, and full `pnpm check` pass.
The next slice is FE-015: admin catalog, orders, and staff product surfaces.

### FE-015: Admin catalog, orders, and staff product surfaces

Complete the operations product with dedicated `/admin/catalog`, `/admin/orders`, and
`/admin/staff` routes plus a refined admin overview that links directly to them. Reuse existing
catalog, order, identity, audit, and permission contracts and add typed client coverage only where
an implemented API endpoint is not yet exposed to the web application.

Catalog must support server-owned item/category visibility and pricing operations; orders must
support dense status inspection and navigation into relevant fulfillment actions; staff must show
role and permission ownership without allowing the browser to grant authority. Each route must be
permission-protected, responsive, keyboard usable, and composed from feature-owned modules rather
than raw form grids.

Acceptance checks:

- Admin navigation exposes catalog, orders, and staff only for sessions with matching permission.
- Server contracts remain the source for prices, order status, roles, and permissions.
- Destructive or authority-changing actions require explicit confirmation and retain API-side
  authorization and audit behavior.
- Empty, loading, error, forbidden, desktop table, and compact mobile states are covered.
- Focused tests, browser checks, production build, `pnpm check`, staging deployment, and role smoke
  tests pass.

## Definition Of Done

- Clear route/component owner and feature-oriented boundary.
- Existing contracts/API helpers are used for server-owned data and permissions.
- Responsive phone and desktop behavior is intentional.
- Loading, empty, error, unauthorized/forbidden, disabled, and success states exist.
- Semantic HTML, labels, focus-visible styles, keyboard behavior, and contrast are checked.
- Focused tests pass, followed by `pnpm check`.
- `git diff --check`, staged diff review, backlog completion record, conventional commit, and push
  to `origin/main` are complete.

## Resume Point

### FE-014 Completion Record

FE-014 is complete and deployed as the polished public storefront. The next resume point is FE-015,
the product-scoped admin catalog, orders, and staff surfaces. Replace the interim Unsplash assets only
when ImageGen access is available, following the documented handoff.

### FE-012 Completion Record

Frontend implementation is complete through FE-012. The next resume point is a new product-scoped
frontend slice, with release verification following the handoff runbook.

### FE-001 Completion Record

Tailwind CSS 4.3.3 and the official `@tailwindcss/postcss` integration are installed for
`@carbon/web`. The global stylesheet now imports Tailwind and semantic token definitions from
`src/styles/tokens.css`; legacy aliases remain temporarily so existing route styles continue to
render while the component migration proceeds. The public and admin roots include utility classes
as a build smoke check, and no API or route behavior changed.

Focused web build, lint, typecheck, and tests pass (23 tests).

### FE-002 Completion Record

The reusable UI and token foundation is complete. The next frontend slice is FE-003: shared shells,
session states, and RBAC navigation.

### FE-003 Completion Record

Shared protected application shells now provide a responsive header, desktop navigation, mobile
sheet navigation, breadcrumbs, role status, account sign-out, and browser offline feedback.
Customer, admin, and delivery routes use server-side session guards with explicit unauthorized,
forbidden, and session-unavailable states. Admin navigation and dashboard reads derive from
server-provided permissions, including superadmin inheritance. Protected routes also include
reusable loading skeletons and retryable error boundaries, while existing API-connected workflows
remain in place.

Focused web lint, typecheck, tests (40 tests), and production build pass. The next frontend slice is
FE-004: public landing page.

### FE-004 Completion Record

The public landing page is now composed from a reusable public shell and feature-owned storefront
sections. It preserves the API-backed hero banner, weekly plans, catalog preview, and Better Auth
flows while adding responsive desktop/mobile navigation, focused authentication dialogs, signed-in
account actions, accessible image alternatives, loading and error boundaries, empty states, and
footer privacy, terms, and support links. Server-owned prices, credits, sessions, and destinations
remain unchanged. Legacy global navigation selectors are scoped so they no longer override shared
application navigation.

Focused web lint, typecheck, tests (41 tests), and production build pass. The next frontend slice is
FE-005: customer catalog and mobile shopping.

### FE-005 Completion Record

The protected `/account/catalog` route now owns the customer shopping workflow. It loads only the
server-backed active catalog and saved cart, supports URL-backed search and category filters, and
provides responsive product cards, accessible quantity controls, server-confirmed cart saving,
availability labels, cart summary, retryable errors, and filter-aware empty states. Customer
navigation includes the catalog, while the account overview links to it instead of duplicating the
old select-based cart editor. Catalog filtering, cart transformations, customer-cookie hydration,
and unavailable API recovery are covered by focused tests. Prices, totals, and availability remain
server-owned. The next frontend slice is FE-006: cart, subscription, and checkout.

Focused web lint, typecheck, tests (48 tests), production build, and the full repository `pnpm check`
pass.

### FE-006 Completion Record

Cart and checkout are now split into route-level experiences backed by feature modules and a small
server loader. All commerce decisions continue to come from shared contracts and protected API
routes. Focused web tests, lint, typecheck, production build, and all 55 repository checks pass. The
next frontend slice is FE-007: customer account, orders, tracking, and support.

### FE-007 Completion Record

Customer order history, order detail, tracking, receipts, signed proof media, general support, and
order cancellation/refund requests are now route-level experiences backed by feature modules and a
customer-owned detail loader. Focused web tests, lint, typecheck, production build, and all 55
repository checks pass. The next frontend slice is FE-008: admin overview and operations navigation.

### FE-010 Completion Record

The delivery staff experience now uses modular feature components, dedicated protected routes, an
ordered IndexedDB event queue, retained conflict states, touch-first controls, server-issued media
uploads, current-cycle history, and installable PWA metadata. Focused web lint, typecheck, tests (57
tests), production build, and practical phone/desktop browser checks pass. The next frontend slice
is FE-011: browser E2E, responsive, accessibility, and visual QA.

### FE-011 Completion Record

The frontend now has a Playwright harness with deterministic role-aware API fixtures, visual
snapshots, cross-role authorization checks, responsive overflow assertions at phone/tablet/desktop
sizes, keyboard and reduced-motion checks, Axe serious/critical accessibility checks, delivery
IndexedDB offline persistence coverage, and manifest coverage. The 24-test browser suite passes.
The OpenNext preview command reaches the production build but cannot finish its Windows symlink
bundle step; run that smoke test in Linux/WSL before release. The next frontend slice is FE-012:
release hardening and handoff.
