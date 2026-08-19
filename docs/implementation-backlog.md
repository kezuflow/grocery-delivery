# Implementation Backlog

This is the durable implementation task list for Carbon Food Delivery. Work is organized into
small, dependency-ordered slices so another engineer can resume from this file without relying on
conversation history or temporary handoff files.

## Working Rules

- Work directly on `main`.
- Keep one slice small enough to review and verify independently.
- Update this backlog only as part of an intentional documentation or feature commit.
- Before starting a slice, mark it `in progress` and record its scope and acceptance checks.
- Before moving to another slice, run the narrowest focused checks plus `pnpm check`, commit the
  completed slice, inspect the staged diff, and push `origin/main`.
- Never commit or push temporary handoff files. The committed Git history and this backlog are the
  resume record.
- Preserve unrelated working-tree changes, including the existing `docs/ui-mockups` deletions.

## Status Legend

- `complete`: implemented, verified, committed, and pushed.
- `in progress`: the only slice currently being changed.
- `next`: highest-priority slice that can start after the current slice is complete.
- `planned`: ordered work that is not yet ready to start.
- `blocked`: cannot proceed without an explicit external decision or dependency.

## Slice Ledger

| Slice | Area                                                            | Status   | Commit / resume point                                                |
| ----- | --------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| 000   | Repository and domain foundation                                | complete | Existing history through `c3da0bc`                                   |
| 001   | API environment database bindings                               | complete | `03ef3bc`                                                            |
| 002   | API runtime composition                                         | complete | `5f6a64e`                                                            |
| 003   | Payment-method revocation administration                        | complete | `7229e08`                                                            |
| 004   | Better Auth production integration                              | complete | `51a8de1`                                                            |
| 005   | Web-to-API service binding and customer flows                   | complete | Complete through order creation                                      |
| 006   | Delivery addresses, serviceability, and weekly delivery windows | next     | Address and geofence complete; weekly windows remain                 |
| 007   | Procurement, shortages, substitutions, and packing              | planned  | Depends on delivery cycles and paid-order projections                |
| 008   | Dispatch, route planning, and driver assignments                | planned  | Depends on packages, windows, capacity, and provider-neutral routing |
| 009   | Deliveryman PWA and offline event sync                          | planned  | Depends on dispatch assignments and delivery events                  |
| 010   | Customer tracking, notifications, and delivery media            | planned  | Depends on delivery events, outbox jobs, and R2 policies             |
| 011   | Jobs, workflows, retries, and operational projections           | planned  | Coordinate with slices 007-010 as their async needs become concrete  |
| 012   | Release hardening and production rehearsal                      | planned  | Depends on all launch-critical operational slices                    |

## Completed Slice: 004

### Better Auth production integration

Scope:

- Add the stable Better Auth runtime dependency and a Cloudflare D1-backed adapter boundary.
- Expose Better Auth handlers under `/api/auth/*` without weakening existing `/api/v1` session and
  authorization checks.
- Validate the auth secret, public API URL, trusted origins, and deployed-environment HTTPS policy.
- Configure secure HTTP-only session cookies for staging and production.
- Add forward-only D1 schema migrations required by Better Auth while preserving domain-owned role
  assignments and authorization data.
- Map Better Auth sessions into the existing domain `Session` contract and load role/customer scope
  from server-owned persistence rather than client-provided fields.
- Add focused configuration, adapter, runtime, route, and session tests.

Acceptance checks:

- `AUTH_MODE=better-auth` starts with valid D1 and secret bindings and fails clearly when required
  configuration is absent or unsafe.
- `/api/auth/*` is handled by Better Auth and is not intercepted by protected `/api/v1` middleware.
- Better Auth sessions resolve to server-owned customer/admin role scopes.
- Staging and production cookies are secure and only configured trusted origins are accepted.
- Existing persistent-session mode remains available for local development and migration fallback.
- Focused package tests and `pnpm check` pass.

Completion record: all acceptance checks passed, including Better Auth D1 integration, secure cookie
and origin-policy tests, sign-out revocation, focused package tests, and `pnpm check`. The
implementation is pushed in `51a8de1`. Do not create a temporary handoff file.

## Completed Slice: 003

### Payment-method revocation administration

Current implementation already supports provider-neutral payment-method creation, durable metadata,
idempotent registration, protected customer listing, and server-side token handling. The remaining
gap is an authorized revocation flow.

Scope:

- Add an application command that verifies customer ownership, current active state, and idempotency.
- Add a billing/provider boundary operation for revoking or detaching a provider method when the
  selected provider supports it; preserve a durable local `revoked` state when it does not.
- Add a repository operation and forward-only D1 migration only if the existing schema cannot
  represent the transition.
- Add a protected API route and response contract for customer revocation.
- Return the existing correlation-aware error envelope for unauthenticated, unauthorized,
  missing, already-revoked, and idempotency-conflict cases.
- Add focused unit, repository, and API tests for ownership, replay, conflict, persistence, and
  provider failure behavior.

Acceptance checks:

- Customer A cannot revoke Customer B's payment method.
- Repeating the same idempotency key returns the original result without a second provider call.
- Reusing an idempotency key for a different method is rejected.
- A revoked method is excluded from active payment-method listings and cannot be charged.
- Provider failure does not silently mark a method revoked unless the provider contract explicitly
  reports a successful detach or an already-detached result.
- Focused package tests and `pnpm check` pass.

Completion record: all acceptance checks passed, including focused package tests and `pnpm check`.
The implementation is pushed in `7229e08`. Do not create a temporary handoff file.

## Later Slice Notes

### 005: Web-to-API service binding and customer flows

This slice is intentionally delivered as small vertical increments. The current increment keeps D1
access behind the API Worker, adds the Cloudflare service binding, and introduces a typed web client
that validates the existing plans and catalog contracts. The public storefront consumes those reads
on the server and renders a useful unavailable state when the API cannot be reached.

Acceptance checks for the current increment:

- Web production configuration binds `API` to the matching API Worker in development, staging, and
  production.
- The web client uses only the API transport and shared Zod contracts; it never imports D1 or API
  implementation modules.
- Public plans and catalog responses are validated before rendering, and API errors are surfaced as
  a stable web-facing error state.
- The storefront remains usable when the API is unavailable, without inventing prices or customer
  state.
- Focused web client tests, the web typecheck/lint/build, and `pnpm check` pass.

Completion record: the current public storefront increment is complete in this commit. It adds
environment-specific API service bindings, a shared-contract client, server-rendered plans and
catalog reads, an unavailable state, and focused transport/client tests. The remaining 005 work is
intentionally left as follow-up increments.

Follow-up increments within 005 will add Better Auth sign-in/session hydration, the authenticated
customer shell, and then cart, subscription, and order journeys as separate reviewable changes.

### Current increment: Better Auth sign-in and session hydration

Scope:

- Proxy same-origin `/api/auth/*` requests through the web Worker API service binding while
  preserving request cookies and Better Auth `Set-Cookie` responses.
- Add typed web-client access to the existing `/api/v1/me` current-session contract.
- Render the authenticated customer identity server-side and provide sign-in, sign-up, and
  sign-out controls that refresh the server-rendered shell after successful mutations.
- Keep unauthenticated and API-unavailable states explicit without trusting client-provided role or
  customer identifiers.

Acceptance checks:

- Auth requests from the web origin reach the API Worker through the configured service binding.
- Better Auth session cookies are forwarded to and returned from the API without exposing them to
  client JavaScript.
- A valid session renders server-owned user and customer scope; a missing or expired session renders
  the signed-out state.
- Invalid credentials and API failures are shown as actionable form state without inventing a
  session.
- Focused web tests, web build/typecheck/lint, and `pnpm check` pass.

Completion record: all acceptance checks passed. The web app now proxies same-origin Better Auth
requests through the API service binding, preserves HTTP-only session cookies, hydrates the current
session from the shared contract, and renders sign-in, sign-up, sign-out, signed-out, and unavailable
states. Focused web tests, the production web build, and `pnpm check` pass. The next 005 increment is
the authenticated customer shell, followed by cart, subscription, and order journeys.

### Current increment: Authenticated customer shell

Scope:

- Add typed web-client reads for the current subscription and persisted cart contracts.
- Add a server-rendered `/account` route restricted to active customer sessions.
- Present server-owned subscription status, plan details, weekly credit, cart contents, and subtotal.
- Resolve cart labels from the validated catalog response without trusting client-supplied prices.
- Render explicit no-subscription, empty-cart, signed-out, and API-unavailable states.

Acceptance checks:

- The account route never renders customer data without an active customer session.
- Subscription and cart responses are validated with shared contracts and receive the browser session
  cookie only on the server.
- Cart names and prices come from server-owned catalog and cart responses; missing catalog entries do
  not invent product data.
- A customer without a subscription or cart receives useful empty states rather than fabricated data.
- Focused web tests, the production web build, and `pnpm check` pass.

Completion record: all acceptance checks passed. The server-rendered `/account` route now hydrates
server-owned subscription and cart state, validates every response through shared contracts, resolves
catalog labels without inventing missing product data, and provides signed-out, empty, and unavailable
states. Focused account tests, the production web build, and `pnpm check` pass. The next 005 increment
is cart editing, followed by subscription actions and order creation.

### Current increment: Cart editing

Scope:

- Proxy same-origin `/api/v1/*` requests through the web API service binding for browser mutations.
- Add a typed cart update client that sends only SKU identifiers and quantities.
- Let authenticated customers change quantities or remove items from the account shell.
- Refresh the server-rendered account state after a successful update and show validation or API
  failures without changing local prices.

Acceptance checks:

- The browser mutation preserves the HTTP-only session cookie and reaches the protected API route.
- Client requests never submit unit prices, totals, credits, or customer identifiers.
- Empty carts and quantity changes render correctly after a successful server response.
- Invalid or unavailable SKU responses remain actionable and do not corrupt displayed totals.
- Focused web tests, the production web build, and `pnpm check` pass.

Completion record: all acceptance checks passed. Authenticated customers can add catalog items,
change quantities, remove lines, and save an empty or populated cart through the same-origin API
proxy. Browser mutations contain only SKU identifiers and quantities; the API remains authoritative
for availability, prices, totals, and customer scope. Focused client tests, the production web build,
and `pnpm check` pass. The next 005 increment is subscription actions, followed by order creation.

### Current increment: Subscription actions

Scope:

- Add typed pause, resume, skip, and cancel mutations to the web API client.
- Render only actions that are valid for the server-owned subscription status.
- Attach a retry-stable idempotency key to every retriable subscription command.
- Refresh the account after success and keep API or cutoff failures actionable.

Acceptance checks:

- The browser submits only the requested action and never submits customer, cycle, status, or plan
  data.
- Every command reaches the protected API route with an idempotency key and the HTTP-only session
  cookie.
- Active, paused, and canceled subscriptions expose appropriate controls without inventing state.
- Failed commands retain their idempotency key for a safe retry and do not optimistically change the
  displayed subscription.
- Focused web tests, the production web build, and `pnpm check` pass.

Completion record: all acceptance checks passed. The account shell now exposes valid pause, resume,
skip, and cancel controls, sends only the requested action with a retry-stable idempotency key, and
refreshes server-owned subscription state after success. Focused client tests, the production web
build, and `pnpm check` pass. The final 005 increment is order creation.

### Current increment: Order creation

Scope:

- Add a typed web-client order mutation that uses the persisted cart by default.
- Let active customers lock the saved cart from the account route with a confirmation step.
- Display the server-calculated order identifier and total after success, then refresh the account.
- Keep inactive subscriptions, empty carts, unavailable SKUs, and configuration failures actionable.

Acceptance checks:

- The browser submits only `{}` plus an idempotency key; it never submits prices, totals, credits,
  plan IDs, subscription IDs, or customer IDs.
- The protected API resolves the session, active subscription, saved cart, catalog prices, plan credit,
  and delivery fee before locking the order.
- A failed order retains its idempotency key for a safe retry and does not clear or alter the cart.
- A successful order clears the saved cart and displays the server-owned order result.
- Focused web tests, the production web build, and `pnpm check` pass.

Completion record: all acceptance checks passed. Active customers can lock their saved cart through
the protected order route with a confirmation step; the browser submits only an empty request body
and an idempotency key. The API resolves customer scope, subscription, cart, catalog prices, plan
credit, and delivery fee server-side, then returns the locked order and clears the saved cart. Focused
client tests, the production web build, and `pnpm check` pass with the Vitest threads pool on Windows.
Slice 005 is complete; the next slice is delivery addresses, serviceability, and weekly windows.

### Current increment: Customer delivery address and postal geofence

Scope:

- Add a customer-owned default delivery address with server-side field validation and D1 persistence.
- Add protected GET/PUT address routes that derive customer ownership from the active session.
- Enforce a configurable `DELIVERY_SERVICE_POSTAL_CODES` allowlist before saving an address.
- Render address editing and server-derived serviceability status in the customer account.

Acceptance checks:

- Address reads and writes cannot cross customer boundaries or accept a client customer ID.
- Invalid phone, postal-code, and bounded text inputs are rejected before persistence.
- A postal code outside the configured allowlist returns `DELIVERY_ADDRESS_UNSERVICEABLE` and is not
  saved.
- The API response owns the `serviceable` flag; the browser does not submit or calculate it.
- Order creation requires a saved address that remains within the current server-side geofence.
- Focused domain, contract, repository, API, and web tests pass.

The allowlist is intentionally runtime configuration rather than a domain constant. Configure
`DELIVERY_SERVICE_POSTAL_CODES` per Worker environment before enabling customer delivery in staging or
production. Local development is permissive when unset; staging and production fail closed.

Completion record: all acceptance checks passed. Customers can save one validated delivery address
through protected API routes and see server-derived serviceability in the account shell. Postal-code
geofencing rejects out-of-area addresses before persistence and blocks checkout without a saved,
currently serviceable address. Migration `0015` adds the D1 address record. Focused tests, the
production web build, and all 53 `pnpm check` tasks pass. The next 006 increment is weekly delivery
windows and capacity.

### 006-010: Operational delivery

Follow the production architecture in `docs/architecture/production-plan.md`: structured address
and serviceability data, weekly cycles and capacity, procurement and packing, dispatch and routing,
driver workflows, offline synchronization, customer tracking, notifications, and R2 delivery media.
Each area must remain split into independently testable application, repository, contract, and
worker slices.

### 011-012: Async and release hardening

Add queues, workflows, retries, dead-letter handling, projections, service bindings, rate limits,
CSRF/origin controls, OpenAPI generation, metrics, backup/restore rehearsal, Friday-cycle rehearsal,
load tests, provider sandbox tests, and incident runbooks after their upstream workflows exist.

## Completed Capability Notes

The repository already contains the following implemented foundations: PHP centavo money rules,
identity/session domain contracts and persistent D1 sessions, catalog and pricing reads, plans and
subscriptions, carts and idempotent order locking, provider-neutral billing with reconciliation,
payment methods, protected API routes, correlation-aware errors, and Wrangler development/staging/
production database environments. See the slice commits above and the architecture document for
the boundary rationale.
