# Implementation Backlog

This is the durable implementation task list for Carbon Food Delivery. Work is organized into
small, dependency-ordered slices so another engineer can resume from this file without relying on
conversation history or temporary handoff files.

## Working Rules

- Work directly on `main`.
- Keep one slice small enough to review and verify independently.
- Update this backlog only as part of an intentional documentation or feature commit.
- Before starting a slice, mark it `in progress` and record its scope and acceptance checks.
- Before committing a completed slice, update this backlog with its completion record and resume
  point, then stage the handoff and implementation together as one conventional commit. Run the
  narrowest focused checks plus `pnpm check`, inspect the staged diff, and push `origin/main`.
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

| Slice | Area                                                            | Status      | Commit / resume point                                              |
| ----- | --------------------------------------------------------------- | ----------- | ------------------------------------------------------------------ |
| 000   | Repository and domain foundation                                | complete    | Existing history through `c3da0bc`                                 |
| 001   | API environment database bindings                               | complete    | `03ef3bc`                                                          |
| 002   | API runtime composition                                         | complete    | `5f6a64e`                                                          |
| 003   | Payment-method revocation administration                        | complete    | `7229e08`                                                          |
| 004   | Better Auth production integration                              | complete    | `51a8de1`                                                          |
| 005   | Web-to-API service binding and customer flows                   | complete    | Complete through order creation                                    |
| 006   | Delivery addresses, serviceability, and weekly delivery windows | complete    | Address geofence and weekly capacity selection complete            |
| 007   | Procurement, shortages, substitutions, and packing              | complete    | Demand aggregation, exceptions, substitutions, and manifests       |
| 008   | Dispatch, route planning, and driver assignments                | complete    | Cycle-scoped admin dispatch assignments                            |
| 009   | Deliveryman PWA and offline event sync                          | complete    | Deliveryman assignments and idempotent offline event sync          |
| 010   | Customer tracking, notifications, and delivery media            | complete    | Customer tracking, idempotent notification adapter, and media URLs |
| 011   | Jobs, workflows, retries, and operational projections           | in progress | Outbox delivery, retry limits, and dead-letter state               |
| 012   | Release hardening and production rehearsal                      | planned     | Depends on all launch-critical operational slices                  |

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

### Current increment: Weekly delivery windows and capacity

Scope:

- Add validated weekly delivery windows and customer-scoped selections with D1 persistence.
- Add protected GET/PUT routes that derive the active cycle and customer ownership server-side.
- Enforce per-window capacity while allowing a customer to change their current-cycle selection.
- Render available Saturday windows, remaining capacity, and the selected window in the account.

Acceptance checks:

- The browser submits only a window ID; customer ownership and cycle assignment come from the server.
- Inactive, missing, cross-cycle, and full windows cannot be selected.
- Capacity counts exclude the customer's existing selection when changing windows and cannot exceed
  the configured window capacity.
- Window reads expose server-derived reserved and remaining capacity and the customer's selection.
- Focused domain, contract, repository, API, and web tests, the production web build, and `pnpm check`
  pass.

Completion record: all acceptance checks passed. Customers can view active windows for the
server-assigned weekly cycle and reserve one through protected API routes. Migration `0016` adds
delivery windows and one customer selection per cycle. Capacity and ownership remain server-owned,
with an atomic guarded D1 write preventing full-window selection. Slice 006 is complete; the next
slice is procurement, shortages, substitutions, and packing.

### Slices 007-008: Procurement and dispatch operations

Scope:

- Aggregate locked order demand by weekly cycle and SKU, with admin purchase quantities.
- Record shortages, approved/rejected substitutions, and packing manifests through permission-scoped
  admin routes.
- Add cycle-scoped dispatch assignments that reference delivery windows and deliveryman identities.
- Keep operational state in D1 repositories with in-memory fixtures for deterministic tests.

Acceptance checks:

- Procurement and packing routes require the matching admin permission; customer sessions are denied.
- Demand is derived from locked order lines and purchase quantities are server-owned.
- Shortages require an actual quantity deficit; substitutions reference an existing cycle shortage.
- Packing manifests are unique per order and remain explicitly pending, packed, or exceptional.
- Dispatch assignments are cycle-scoped, idempotently replace an order assignment, and expose only
  server-persisted status and timestamps.
- Focused domain, repository, contract, API tests, `pnpm check`, and the production web build pass.

Completion record: slices 007 and 008 are complete for the first operational increment. Migration
`0017` adds procurement purchases, shortages, substitutions, packing manifests, and dispatch
assignments. Admin APIs expose demand and exception handling with server-derived cycle scope, while
dispatch assignments are persisted against the selected delivery window and deliveryman user.

### Slice 009: Deliveryman PWA and offline event sync

Scope:

- Add deliveryman-scoped assignment reads for the active weekly cycle.
- Add immutable delivery events with client event IDs for retry-safe offline synchronization.
- Add a deliveryman web console that queues events locally and flushes them when connectivity returns.

Acceptance checks:

- Customers and unrelated deliverymen cannot read or write another deliveryman assignment.
- Event writes verify assignment, order, and deliveryman ownership server-side.
- Replaying the same client event ID returns the original durable event without duplication.
- Event timestamps are supplied by the client for occurrence and by the server for receipt.
- The deliveryman console preserves unsent events across refreshes and retries after reconnect.
- Focused domain, repository, contract, API, web tests, and the production web build pass.

Completion record: migration `0018` adds immutable delivery events with unique client event IDs.
Protected deliveryman routes expose current-cycle assignments, event history, and idempotent event
submission. The `/deliveryman` console stores pending events in local storage and retries them when
the browser is online again. Slice 009 is complete; the next slice is customer tracking,
notifications, and delivery media.

### Slice 010: Customer tracking, notifications, and delivery media

Scope:

- Expose customer-owned delivery tracking snapshots backed by dispatch assignments and immutable
  delivery events.
- Define an idempotent notification sender boundary for delivery updates.
- Authorize deliveryman proof-of-delivery media and issue short-lived upload/download URLs through
  the storage boundary.

Acceptance checks:

- Tracking and media reads derive customer ownership from the active session and hide other orders.
- Delivery media requests verify the active-cycle assignment belongs to the deliveryman.
- Media retries use a client media ID and return the original durable record without duplication.
- Only bounded image content types and sizes are accepted; object keys and signed URL expiry are
  server-owned.
- Notification retries are deduplicated by an event-derived idempotency key.
- Focused domain, repository, contract, notification, storage, API, and web checks pass.

Completion record: migration `0019` adds delivery-media metadata while binary objects remain behind
the storage signer boundary. Protected customer routes expose tracking timelines and signed proof
downloads; the deliveryman media route validates assignment ownership and returns a short-lived
upload URL. The notification package now provides a retry-safe adapter contract for delivery-event
messages. Slice 010 is complete; the next increment is jobs, workflows, retries, and operational
projections.

### 006-010: Operational delivery

Follow the production architecture in `docs/architecture/production-plan.md`: structured address
and serviceability data, weekly cycles and capacity, procurement and packing, dispatch and routing,
driver workflows, offline synchronization, customer tracking, notifications, and R2 delivery media.
Each area must remain split into independently testable application, repository, contract, and
worker slices.

### Completed increment: Outbox delivery and retryable jobs

Scope:

- Add a repository boundary for claiming pending outbox events and recording successful delivery,
  retry attempts, and dead-letter state without exposing SQL to workers.
- Add a queue consumer adapter that acknowledges successful jobs, retries transient failures with a
  bounded delay, and leaves exhausted messages available for dead-letter handling.
- Keep job messages correlation-aware and idempotent by durable outbox event ID.
- Preserve the existing order-lock transaction and event payload contract.

Acceptance checks:

- A pending outbox event can be claimed once, even when multiple consumers race.
- Successful handling marks the event published and a replay does not invoke the handler twice.
- Failed handling increments attempts and retries until the configured limit, then records a
  dead-letter state without losing the original payload.
- Queue acknowledgements and retries are explicit and testable without a live Cloudflare Queue.
- Focused DB and jobs tests, typechecks, lint, and `pnpm check` pass.

Completion record: migration `0020` adds leased claims, retry scheduling, error details, and
dead-letter timestamps to the existing outbox table. `@carbon/db` now owns the D1 and in-memory
outbox lifecycle, while `@carbon/jobs` provides a queue publisher and consumer adapter with
correlation-aware, idempotent messages. The existing order-lock transaction remains unchanged.
Focused DB/jobs tests and `pnpm check` pass. Slice 011 remains in progress; the next increment is
workflow orchestration and operational projections.

### Next increment: Workflow orchestration and operational projections

Scope:

- Add a framework-independent workflow definition for weekly operational steps and explicit retry
  boundaries, then adapt it to the Cloudflare Workflows runtime.
- Add server-owned operational projection reads for outbox lag, delivery progress, and procurement
  exceptions without duplicating transactional state.
- Keep workflow state separate from D1 source-of-truth records and preserve correlation IDs across
  every step.

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
