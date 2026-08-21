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

| Slice  | Area                                               | Status   | Depends on            |
| ------ | -------------------------------------------------- | -------- | --------------------- |
| FE-001 | Tailwind baseline and CSS migration                | complete | `da3e311` -> current  |
| FE-002 | Tokens and accessible UI primitives                | complete | `b0b575a` -> current  |
| FE-003 | Shared shells, session states, and RBAC navigation | complete | FE-002 -> FE-004      |
| FE-004 | Public landing page                                | complete | FE-003 -> FE-005      |
| FE-005 | Customer catalog and mobile shopping               | planned  | FE-003, FE-004        |
| FE-006 | Cart, subscription, and checkout                   | planned  | FE-005                |
| FE-007 | Customer account, orders, tracking, and support    | planned  | FE-006                |
| FE-008 | Admin overview and operations navigation           | planned  | FE-003                |
| FE-009 | Admin operational workspaces                       | planned  | FE-008                |
| FE-010 | Delivery dashboard and mobile PWA workflow         | planned  | FE-003                |
| FE-011 | Browser E2E, responsive, accessibility, visual QA  | planned  | FE-004 through FE-010 |
| FE-012 | Frontend release hardening and handoff             | planned  | FE-011                |

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

### FE-007: Customer account, orders, tracking, and support

Split the existing API-connected account page and its components into account, order
history/detail, tracking, receipts, privacy, notification, and support feature modules and routes.
Preserve their current mutations and server ownership checks. Add fulfillment/delivery timelines
plus loading, not-found, unauthorized, empty-history, and submission states.

### FE-008: Admin overview and operations navigation

Decompose the existing API-connected single-page admin console into an operations shell and
dashboard overview without losing its working actions: KPI cards, cycle summary,
outbox/delivery/procurement alerts, recent activity, and permission-aware quick actions. Use dense
desktop comparison and prioritized mobile summaries.

### FE-009: Admin operational workspaces

Move the existing admin procurement, packing, dispatch, support, reporting, promotions, audit,
refund, order-request, and configuration integrations into separate feature modules and routes;
complete catalog/pricing and staff surfaces against implemented contracts and endpoints. Use
responsive tables, drawers/dialogs for focused edits, explicit destructive-action confirmation,
server validation, and permission-aware controls.

### FE-010: Delivery dashboard and mobile PWA workflow

Refactor the existing API-connected delivery console into a touch-first delivery shell with
assignment queue/detail, route view, proof-of-delivery, failure reasons, history, and sync status.
Preserve assignment scoping, idempotent event submission, and server-issued media URLs. Add the
IndexedDB-backed ordered event queue, retry/conflict messaging, online/offline banners, and a useful
desktop view.

### FE-011: Browser E2E, responsive, accessibility, and visual QA

After FE-004 through FE-010 have completed the planned UI, add the Playwright harness and coverage
for public, customer, admin, and delivery journeys at phone, tablet, and desktop widths. Add visual
checkpoints for shared shells, landing, checkout, admin overview, and delivery detail. Check
authentication and wrong-role access, keyboard navigation, reduced motion, offline states,
contrast, connected API behavior, and OpenNext preview behavior.

### FE-012: Frontend release hardening and handoff

Document environment/configuration, runtime error hooks, caching/loading guidance, and module
conventions. Verify auth cookies, API origin, CSP/security headers, image domains, and Cloudflare
bindings in staging/production builds. Record test roles, rollback notes, known gaps, and resume
point.

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
