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

| Slice | Area                                                            | Status      | Commit / resume point                                                                    |
| ----- | --------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- |
| 000   | Repository and domain foundation                                | complete    | Existing history through `c3da0bc`                                                       |
| 001   | API environment database bindings                               | complete    | `03ef3bc`                                                                                |
| 002   | API runtime composition                                         | complete    | `5f6a64e`                                                                                |
| 003   | Payment-method revocation administration                        | complete    | `7229e08`                                                                                |
| 004   | Better Auth production integration                              | complete    | `51a8de1`                                                                                |
| 005   | Web-to-API service binding and customer flows                   | complete    | Complete through order creation                                                          |
| 006   | Delivery addresses, serviceability, and weekly delivery windows | complete    | Address geofence and weekly capacity selection complete                                  |
| 007   | Procurement, shortages, substitutions, and packing              | complete    | Demand aggregation, exceptions, substitutions, and manifests                             |
| 008   | Dispatch, route planning, and driver assignments                | complete    | Cycle-scoped admin dispatch assignments                                                  |
| 009   | Deliveryman PWA and offline event sync                          | complete    | Deliveryman assignments and idempotent offline event sync                                |
| 010   | Customer tracking, notifications, and delivery media            | complete    | Customer tracking, idempotent notification adapter, and media URLs                       |
| 011   | Jobs, workflows, retries, and operational projections           | complete    | Durable outbox, workflow retries, and operational projections                            |
| 012   | Release hardening and production rehearsal                      | complete    | OpenAPI, origin checks, and rehearsal foundations complete                               |
| 013   | Production identity and account lifecycle                       | complete    | Verified auth, admin role controls, and MFA enforcement complete                         |
| 014   | Subscription onboarding and plan selection                      | complete    | Onboarding, effective-cycle lifecycle, and confirmation UX complete                      |
| 015   | Real payments and customer checkout                             | complete    | `a5469f2` checkout pricing; campaign administration complete                             |
| 016   | Immutable order fulfillment and cutoff enforcement              | complete    | `b7fde24`; immutable snapshots, payable/packed dispatch, and order history complete      |
| 017   | Admin operations console                                        | in progress | Dashboard and first mutation controls complete; marketing/media/support workflows remain |
| 018   | Deployable jobs, queues, workflows, and notifications           | planned     | Depends on outbox and operational workflows                                              |
| 019   | Customer fulfillment, support, and payment history              | planned     | Depends on orders, payments, tracking, and notifications                                 |
| 020   | Delivery staff production workflow                              | planned     | Depends on immutable orders, dispatch, storage, and offline sync                         |
| 021   | Privacy, audit, compliance, and launch observability            | planned     | Depends on identity, payments, admin, and operational events                             |
| 022   | Staging launch rehearsal and go/no-go gate                      | planned     | Depends on all launch-critical slices                                                    |

### Completed Slice: 013 production identity and account lifecycle

Current increment: production auth mode and server-owned account lifecycle

- Require Better Auth in staging and production while retaining persistent sessions only for local
  development and deterministic tests.
- Add customer-scoped session listing/revocation, sign-out-all-devices, account export, consent
  recording, profile correction, and deletion-eligibility reads.
- Keep lifecycle writes idempotent and auditable through repository boundaries.
- Add focused configuration, repository, contract, and API tests before continuing email delivery,
  password recovery, administrator bootstrap, and MFA enforcement.

Completion record: all acceptance checks for this increment passed. Staging and production now
require Better Auth configuration, secure trusted origins, and runtime secrets; persistent sessions
are limited to development and test. Protected account APIs expose profile correction, account
export, consent recording, session inventory, per-session revocation, sign-out-all-devices, and
server-derived deletion eligibility. D1 handles both legacy and Better Auth sessions, records audit
events, and stores idempotent profile/consent command results in migration `0021`. The generated
OpenAPI document includes the lifecycle routes, and the complete `pnpm check` passes all 55 tasks.

Final completion record: Better Auth now requires verified email in deployed environments, delivers
verification and password-reset actions through an injectable idempotent notification boundary, and
supports TOTP enrollment with migration `0022`. Configured bootstrap emails receive audited,
server-owned superadmin scope with mandatory MFA, while an MFA-protected superadmin command owns
subsequent role assignments. Server-resolved MFA guards all administrator routes and sensitive
payment writes. Focused notification, configuration, contract, repository, API, and real D1 Better
Auth tests cover verification, password reset, bootstrap, role assignment, and MFA rejection.

Next resume point: begin Slice 014 with idempotent customer plan selection and subscription creation.
Replace the example deployed origins and administrator bootstrap emails, configure a production
identity email sender, and set `BETTER_AUTH_SECRET` through Wrangler secrets before staging deployment.

Slice 012 completion record: all acceptance checks passed. The API now serves a reproducibly
generated OpenAPI document from server-owned contract metadata, exposes explicit origin protection
for state-changing browser requests, and has environment-specific API origins and CORS values in
Wrangler service-binding configuration. Provider webhooks remain server-to-server and are exempt
from browser-origin checks. Deterministic, credential-free rehearsal preflights validate migration
numbering, backup/restore, Friday-cycle, provider sandbox, bounded load, and incident-response
runbooks. Focused origin, configuration, OpenAPI, API runtime tests and the complete `pnpm check`
pass all 55 tasks.

Next resume point: begin Slice 013 with production Better Auth configuration and account lifecycle
operations. Replace the example staging/production origins in `apps/api/wrangler.jsonc` with the
real deployed origins before any non-local deployment.

### Previous Slice: 012 release hardening and production rehearsal

Completed increment: request rate limiting and API metrics

- Add an async, framework-independent request-rate-limit boundary with a deterministic in-memory
  implementation for local/test use and injectable Cloudflare KV or Durable Object adapters.
- Apply conservative limits to authentication and retriable write surfaces, returning the existing
  correlation-aware error envelope with `Retry-After` and limit headers.
- Add a correlation-aware API metrics sink for request method, path, status, and duration.
- Add focused tests for allowed requests, exhaustion, independent keys/routes, reset behavior, and
  success/failure/rate-limit metrics.

Acceptance checks for this increment:

- Rate limiting is enforced only for configured sensitive routes and never trusts client identity or
  commerce values.
- The default implementation is deterministic and isolated per API instance; production persistence
  remains an injectable boundary rather than a business-rule dependency.
- Rate-limit responses preserve the standard error envelope and correlation ID.
- Every API request emits one completion metric, including rejected requests and unexpected failures.
- Focused tests and `pnpm check` pass.

Completion record: all acceptance checks passed. `@carbon/application` now owns an async
request-rate-limit boundary and deterministic fixed-window implementation. The API applies
configurable per-client policies to authentication attempts and write routes, returns the standard
correlation-aware `429` envelope with limit and retry headers, and accepts an injectable shared-state
adapter for later KV or Durable Object persistence. `@carbon/observability` now owns structured API
request metrics covering successful, rejected, and unexpected-failure responses. API unit/runtime
tests and Miniflare integration tests run in separate serial processes to avoid the Windows native
process-pool crash; the complete `pnpm check` passes all 55 tasks.

Next resume point: add generated OpenAPI documentation for the existing contract-backed endpoints,
then continue service-binding hardening, CSRF/origin verification, and deterministic production
rehearsal runbooks. Do not mark Slice 012 complete until those remaining areas pass their checks.

## Review-Derived Launch Roadmap

The following slices turn the production-readiness review into bounded vertical increments. Only one
slice may be `in progress` at a time. Do not start a later slice by assuming an earlier foundation is
good enough; its acceptance checks must be recorded as complete first.

### Slice 012 remaining: API hardening and deterministic rehearsal foundations

Scope:

- Generate OpenAPI documentation from the existing contracts and protected routes.
- Complete service-binding configuration and explicit CSRF/origin checks for state-changing requests.
- Add deterministic runbooks and executable checks for migration rehearsal, backup/restore, Friday
  cutoff, provider sandbox, load, and incident-response preparation.
- Keep rate-limit and metrics adapters injectable and document their production bindings.

Acceptance checks:

- OpenAPI output is generated from server-owned contracts and is checked in or reproducibly built.
- State-changing requests reject missing or untrusted origins with the standard correlation-aware
  error envelope; same-origin and configured trusted origins remain usable.
- Staging migration, backup/restore, and Friday-cycle procedures run without production credentials.
- Provider sandbox and load-test commands have documented prerequisites, bounded data, and cleanup.
- Focused checks and `pnpm check` pass.

### Slice 013: Production identity and account lifecycle

Scope:

- Make Better Auth the explicit staging/production mode with validated secret, URL, trusted origins,
  secure cookies, and service bindings.
- Add email verification, password reset, session revocation including sign-out-all-devices, admin
  bootstrap/role assignment, and MFA enforcement for administrators and sensitive payment actions.
- Add account export, correction, deletion eligibility, and consent records behind server-owned scope.

Acceptance checks:

- A new production-configured customer can verify an email, sign in, reset a password, and revoke
  every active session.
- Admin access requires server-owned role assignment and MFA; customer input cannot grant roles.
- Account lifecycle operations are idempotent, auditable, and covered by focused API and repository
  tests.
- Persistent-session mode remains explicitly local-only or is removed after migration evidence.

### Slice 014: Subscription onboarding and plan selection

Current increment: server-side plan selection and idempotent subscription creation

- Accept only a plan identifier from the customer and resolve the active plan through the server-owned plan lookup.
- Create one active customer subscription using the authenticated customer scope and server timestamps.
- Persist and replay idempotency records atomically where the repository supports it, rejecting conflicting key reuse.
- Add account plan-selection controls and API/client tests that exclude browser-supplied prices and customer identifiers.

Completion record: this increment is implemented and verified. The application service, D1 repository
boundary, protected API route, OpenAPI metadata, account UI, contracts, and focused tests now cover
active-plan validation, authenticated customer ownership, one-subscription enforcement, idempotent
replay, conflicting key reuse, and inactive/unknown plan rejection. The complete `pnpm check`
passes all 55 tasks.

Next resume point: define and implement explicit plan-change effective-cycle semantics, cancellation
and pause behavior across billing boundaries, past-due transitions, and the broader onboarding
confirmation UX before marking Slice 014 complete.

Final completion record: Slice 014 is complete. Subscription creation, plan changes, pause, resume,
skip, and cancellation are idempotent and use the server-assigned upcoming delivery cycle. Active
plans are resolved server-side for both onboarding and plan changes. Subscription lifecycle status
is kept separate from billing standing, with explicit `current` and `past_due` behavior; past-due
subscriptions cannot order or make non-cancellation lifecycle changes, while an idempotent billing
transition boundary is ready for the recurring payment workflow. Migration `0023` persists billing
standing and effective-cycle metadata. The account experience now includes review-and-confirm states
for starting or switching plans and never submits prices or customer ownership. Focused domain,
application, contract, repository, API, and web tests plus the complete `pnpm check` pass.

Next resume point: begin Slice 015 with a real Philippine provider sandbox adapter, payment-method
setup, checkout authorization, and recurring weekly billing. Use the subscription billing transition
service to mark failed recurring charges past due and successful recovery charges current without
coupling provider SDKs to the domain.

Scope:

- Add an idempotent customer plan-selection/subscription-creation command.
- Resolve the selected plan server-side and define plan-change timing, cancellation, pause, and
  past-due behavior.
- Add customer-facing plan selection and confirmation states that never submit prices or customer IDs.

Acceptance checks:

- A verified customer can move from public plans to one active subscription through the web UI.
- Invalid, inactive, or changed plans are rejected before persistence.
- Replaying an idempotency key returns the original subscription; conflicting reuse is rejected.
- Plan changes and cancellation have explicit effective-cycle semantics and focused tests.

### Slice 015: Real payments and customer checkout

Scope:

- Add a real Philippine payment-provider adapter behind the existing billing boundary and complete
  sandbox contract tests.
- Add customer payment-method setup, checkout authorization, recurring weekly charging, retries,
  failed-payment/past-due states, webhook queue processing, reconciliation, and payment history.
- Add customer payment UI and finance-admin refund/partial-refund workflows.
- Add a server-owned promotion and discount engine for coupon codes and automatic offers. Support
  fixed PHP-centavo discounts, percentage discounts with a maximum cap, free-delivery discounts,
  first-order/first-week eligibility, minimum subtotals, plan/SKU/category eligibility, campaign
  budgets, total and per-customer redemption limits, scheduling, pause/expire/archive states, and
  explicit non-stacking rules.
- Add customer coupon apply/remove controls that submit only a normalized code. Resolve eligibility,
  savings, and final totals server-side and revalidate the promotion during order locking.
- Require marketing creation and finance approval for price-affecting campaigns, with emergency pause
  and redemption reporting.

Acceptance checks:

- Staging can tokenize a payment method, authorize a checkout, process a recurring charge, and
  reconcile a webhook without storing raw payment credentials.
- Provider retries and webhook replays are idempotent and observable.
- Production configuration rejects `disabled` and `fake` providers for launch environments.
- Refunds verify permissions, ownership, amount bounds, idempotency, and durable provider state.
- Invalid, expired, ineligible, exhausted, paused, and conflicting coupon codes return stable errors;
  redemption is idempotent and cannot exceed campaign or customer limits.
- Automatic offers and coupon codes cannot be stacked unless an explicit server-owned rule allows it.
- Checkout responses expose original subtotal, discount, delivery fee, credit, and final total from
  server calculation only; the browser never submits a discount amount.

Current increment: PayMongo provider adapter and launch configuration

Completion record: the billing package now includes a thin PayMongo HTTP adapter with provider-issued
token handling, idempotency headers, charge/refund mapping, webhook HMAC verification, and bounded
reconciliation reads. Runtime configuration accepts `paymongo`, requires `PAYMONGO_SECRET_KEY`,
validates an HTTPS API origin, and rejects disabled or fake payment providers outside development and
test. Focused provider/configuration tests, API tests, typechecks, lint, and the complete `pnpm check`
pass. Staging and production Wrangler environments now select PayMongo; the secret must be provisioned
through Wrangler secrets before deployment.

Next resume point: add durable recurring-charge attempts/retries and customer payment history, then
implement the server-owned promotion and coupon rule engine before wiring checkout UI.

Current increment: recurring billing coordination and bounded retries

Completion record: `@carbon/billing` now coordinates weekly charge outcomes with the existing
subscription billing transition boundary. Successful charges restore `current`; failed and pending
charges set `past_due`, preserve provider errors for the job layer, and derive retryability without
duplicating subscription rules. Idempotent status keys are derived from the charge key, and bounded
exponential retry delays are covered by focused tests. Billing tests, lint, and typecheck pass.

Next resume point: add durable payment-attempt history reads and customer payment UI, then implement
the server-owned promotion and coupon rule engine before wiring checkout totals.

Completion record: customer payment history is now a server-owned read across the billing, D1,
contract, API, and web boundaries. Charge and refund records are normalized from durable attempts and
refunds, scoped to the authenticated customer, sorted newest-first, and rendered in the account shell
without provider references or client-supplied totals. Focused repository, contract, API-client, and
web tests plus the complete `pnpm check` pass.

Next resume point: implement the server-owned promotion and coupon rule engine, including eligibility,
budgets, redemption idempotency, and non-stacking before adding checkout coupon controls.

Completion record: the domain now owns normalized promotion codes and deterministic evaluation for
fixed, capped percentage, and free-delivery discounts, including schedules, status, minimum subtotal,
plan/SKU/category eligibility, first-order/first-week rules, campaign budgets, total and per-customer
limits, and explicit stacking policy. The application boundary adds idempotent customer redemption
records and stable conflicting-key errors. Focused domain/application tests, lint, and typecheck pass.

Current increment: customer coupon controls and server-calculated checkout

Completion record: customer coupon preview/apply and removal now use authenticated API routes and
submit only a normalized code. Checkout pricing resolves catalog prices, plan values, delivery fees,
promotion eligibility, savings, and final totals on the server. Order locking re-runs the same
promotion evaluation and persists the applied campaign ID, normalized code, rule version, discount,
and delivery-fee result in an immutable order snapshot. D1 writes the redemption, campaign counters,
locked order, order lines, and outbox event atomically; a failed or exhausted revalidation cannot
create a discounted order. Focused domain, application, repository, API integration, contract, and
web tests pass.

Next resume point: add marketing campaign creation and finance approval, then continue Slice 016
with immutable delivery-address, delivery-window, and payment-state snapshots.

Final completion record: Slice 015 is complete. PayMongo charging, recurring billing coordination,
payment history, refunds with cumulative bounds, server-owned promotion evaluation and persistence,
customer coupon apply/remove, server-calculated checkout totals, promotion revalidation during order
locking, immutable applied-promotion snapshots, and permission-scoped campaign administration are
implemented. Marketing administrators can create and list draft campaigns, finance administrators
alone can activate price-affecting campaigns, and authorized marketing users can pause, expire, or
archive campaigns. Focused contract, API, application, repository, integration, and web checks plus
the complete `pnpm check` pass.

Next resume point: finish Slice 016 with packed-state validation and immutable customer order history,
then continue the admin operations and deployable workflow slices.

Final completion record: Slice 016 is complete. Server cutoff and cycle assignment, immutable address
and delivery-window snapshots, applied-promotion and payment-state snapshots, payment-state updates,
customer-scoped order history, and dispatch validation for paid, packed, cycle-matching,
window-matching orders are implemented. Forward-only migrations `0026` and `0027` preserve legacy
rows and restore all snapshots through D1. Focused application, repository, API, and integration
coverage plus the complete `pnpm check` pass.

Next resume point: begin Slice 017 with the permission-scoped admin operations and marketing console,
then continue deployable jobs, customer fulfillment, delivery staff, compliance, and launch rehearsal.

Current increment: authenticated admin operations dashboard

Completion record: the web application now provides an authenticated `/admin` route for administrator
sessions and reads the server-owned operational projection, procurement, dispatch, and promotion
campaign surfaces through validated shared contracts. Permission failures and unavailable services
render explicit states, while dashboard values remain server-derived. Focused web/API checks pass.

Next resume point: add admin mutation controls for packing, procurement, dispatch, campaign approval,
and emergency pause with audit feedback.

Current increment: admin operations mutation controls and shared 429 retry behavior

Completion record: the authenticated admin console now exposes permission-scoped controls for
procurement purchases, shortages, substitutions, packing manifests, dispatch assignments, and
campaign pause/resume/archive actions. Each mutation sends only validated command fields through
the same-origin API client, refreshes server-owned state after success, and surfaces stable API
errors without optimistic operational state. The web API client and PayMongo provider retry one
rate-limited request after a five-second delay, with injectable sleeps for deterministic tests.
Focused web and billing tests, typechecks, lint, and the production web build pass.

Next resume point: add campaign draft creation/finance approval UX, banner content and media
management, public active-promotion reads, and admin customer/support/refund/audit surfaces.

Completion record: D1 now has forward-only promotion campaign and redemption tables, with server-owned
rule snapshots, normalized code lookup, customer redemption counts, idempotency restoration, and an
atomic redemption budget/count update path. Focused repository/application coverage and the complete
`pnpm check` pass.

Next resume point: expose customer coupon apply/remove controls and feed promotion results into
server-calculated checkout totals with revalidation during order locking.

Completion record: refund orchestration now derives the remaining refundable balance from durable,
attempt-scoped successful refunds and rejects cumulative over-refunds with stable
`REFUND_EXCEEDS_CHARGE` errors before contacting the provider. Failed refunds do not consume the
balance, and focused billing/repository coverage plus the complete `pnpm check` pass.

Next resume point: persist campaign/redemption records in D1 and expose customer coupon apply/remove
controls that feed server-calculated checkout totals.

### Slice 016: Immutable order fulfillment and cutoff enforcement

Current increment: server-side order cutoff and immutable cycle snapshot

Completion record: order creation now evaluates the server clock against the Manila weekly-cycle
cutoff before reading or clearing the cart. Requests at or after the cutoff return stable
`ORDER_CUTOFF_PASSED` errors with the affected cycle and cutoff timestamp; the cart remains intact.
The reusable application cutoff policy has focused boundary tests, and locked orders now carry the
server-assigned cycle ID through application, D1, outbox, and API response boundaries. A forward-only
migration preserves existing rows with a legacy marker, and the complete `pnpm check` passes.

Next resume point: add immutable delivery-address/window, payment-state, and applied-promotion
snapshots to locked orders.

Current increment: immutable fulfillment snapshots and payable dispatch guards

Completion record: locked orders now snapshot the serviceable delivery address, selected delivery
window, payment state, and applied promotion alongside the server-owned cycle and commerce totals.
Forward-only migration `0027_order_fulfillment_snapshots.sql` persists the new facts, the D1
repository restores them, and successful or failed payment attempts update the immutable order's
payment state through a repository boundary. Dispatch assignment now rejects missing orders,
cross-cycle orders, window mismatches, and unpaid orders. Focused application, repository,
integration, and API checks pass.

Next resume point: add explicit packed-state validation and immutable order history reads, then
finish Slice 015 campaign creation/approval before marking the checkout and fulfillment slices
complete.

Scope:

- Snapshot delivery address, delivery window, cycle, plan/credit, fees, and payment state into the
  locked order.
- Snapshot every applied promotion/coupon reference, promotion rule version, and discount amount in
  the locked order so later campaign edits cannot change historical totals.
- Enforce the weekly cutoff server-side and prevent post-lock edits from changing fulfillment facts.
- Require packed, payable, cycle-matching orders before dispatch assignment.

Acceptance checks:

- Changing an address or window after checkout does not change the locked order snapshot.
- Orders after the cutoff receive a deterministic error and do not clear the cart.
- Dispatch rejects unpacked, unpaid, cross-cycle, or window-mismatched orders.
- Migration and repository tests cover snapshot restoration and concurrent idempotent locking.
- Refunds and partial refunds use the immutable paid amount and recorded discount allocation rather
  than recalculating against the current promotion configuration.

### Slice 017: Admin operations console

Scope:

- Build authenticated admin screens for catalog/pricing, delivery windows/capacity, customer and
  subscription support, procurement, shortages/substitutions, packing, dispatch, exceptions,
  refunds, audit history, projections, and alerts.
- Add a marketing administration area for draft, scheduled, active, expired, paused, and archived
  campaigns; coupon/automatic-offer rules; finance approval; emergency pause; redemption counts;
  remaining budget; and audit history.
- Add banner content management with home-hero, storefront-strip, and account-banner placements;
  title, copy, CTA label/destination, accessible alt text, priority, start/end schedule, desktop and
  mobile assets, preview, publish, replace, and archive actions.
- Upload promotional assets through a dedicated R2 media boundary using signed URLs, immutable object
  keys, content-type/file-size/dimension validation, orphan cleanup, retention rules, and safe public
  download URLs. Do not reuse delivery proof media authorization or object paths.
- Expose a public active-promotions read endpoint with server-resolved schedule, placement, priority,
  and cache version/ETag behavior. The storefront renders a safe fallback when media is unavailable.
- Record bounded impression/click analytics for published campaigns without allowing client-provided
  prices, eligibility, or campaign status.
- Use existing permission-scoped API contracts; do not duplicate business rules in the web app.

Acceptance checks:

- Authorized administrators can complete a full weekly operations cycle through the UI.
- Each screen shows server-owned status, errors, correlation IDs, and actionable empty states.
- Permission boundaries are tested for every admin area; customers cannot access admin data.
- Marketing users can draft and preview campaigns, while only authorized finance users can approve
  price-affecting rules. Publishing and emergency pause actions are audited with actor and timestamp.
- Banner uploads reject unsupported media, oversized files, invalid dimensions, and unsafe CTA
  destinations before publication; replacing an asset does not serve stale content.
- Public promotion reads expose only currently active, approved campaigns and never reveal draft,
  paused, expired, budget-exhausted, or audience-ineligible campaigns.

### Slice 018: Deployable jobs, queues, workflows, and notifications

Scope:

- Add production Worker entrypoints and Wrangler bindings for queue producers/consumers, cron
  triggers, workflow bindings, dead-letter handling, outbox dispatch, payment/webhook jobs,
  notification jobs, and retention jobs.
- Wire API writes to the durable outbox and expose queue lag/dead-letter alerts.

Acceptance checks:

- Staging can publish, consume, retry, dead-letter, and replay an outbox event without duplication.
- Cron starts the weekly workflow and every step preserves correlation and idempotency.
- Failed payment, notification, and retention jobs are observable with bounded retries and alerts.

### Slice 019: Customer fulfillment, support, and payment history

Scope:

- Add customer order history, receipts, payment history, tracking, proof-of-delivery media, delivery
  notifications/preferences, substitution approval, cancellation/refund requests, multiple saved
  addresses, support/contact workflow, and clear cutoff/payment/delivery status messaging.

Acceptance checks:

- Customers see only their own orders, payment records, media, substitutions, and support requests.
- Every state shown in the web app comes from validated server responses; no optimistic commerce
  totals or statuses are invented client-side.
- Notification preferences and support requests are persisted, auditable, and retry-safe.

### Slice 020: Delivery staff production workflow

Scope:

- Add customer name/address/phone/instructions, route ordering and map integration, contact/support
  actions, required event sequencing, real R2 proof-of-delivery storage, failure reason codes,
  offline conflict resolution, and delivery privacy/safety controls.

Acceptance checks:

- Delivery staff see only assigned orders and the minimum data required for the current route.
- Event sequencing and failure reasons are validated server-side and remain idempotent offline.
- Proof media is stored and retrieved through real signed storage URLs with retention controls.

### Slice 021: Privacy, audit, compliance, and launch observability

Scope:

- Add audit events for refunds, dispatch changes, role changes, manual status changes, and account
  lifecycle operations.
- Add consent UI, data export/deletion workflows, secret-rotation procedures, security-header
  verification, webhook replay protection tests, abuse monitoring, and operational alerts.

Acceptance checks:

- Sensitive operations have actor, target, reason, correlation, and timestamp audit records.
- Customers can view and manage consent and request export/deletion within documented eligibility.
- Alerts exist for failed payments, dead letters, cutoff failures, delivery exceptions, and abusive
  request patterns, with an owner and response procedure.

### Slice 022: Staging launch rehearsal and go/no-go gate

Scope:

- Run full customer-to-delivery E2E tests, migration rehearsal, backup/restore, Friday-cycle,
  provider-sandbox, security, and bounded 20,000-cart load tests in staging.
- Record launch configuration for catalog, windows, service zones, delivery pricing, payment provider,
  secrets, retention, alerts, incident ownership, and rollback procedures.

Acceptance checks:

- All launch-critical flows pass from signup through payment, order lock, operations, delivery, and
  customer tracking.
- Restore and rollback procedures are timed, verified, and documented with named owners.
- No environment uses fake/disabled payment settings, zero-value production defaults, or missing
  serviceability configuration.
- Slice 012 through Slice 021 completion records are present; only then may Slice 022 be marked
  complete and the product considered launch-ready.

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
Focused DB/jobs tests and `pnpm check` pass. Slice 011 continues with
workflow orchestration and operational projections.

### Completed increment: Workflow orchestration and operational projections

Scope:

- Add a framework-independent workflow definition for weekly operational steps and explicit retry
  boundaries, then adapt it to the Cloudflare Workflows runtime.
- Add server-owned operational projection reads for outbox lag, delivery progress, and procurement
  exceptions without duplicating transactional state.
- Keep workflow state separate from D1 source-of-truth records and preserve correlation IDs across
  every step.

Completion record: `@carbon/workflows` now defines the ordered weekly operational workflow with
explicit exponential retry boundaries and a Cloudflare Workflows adapter. `@carbon/db` exposes
read-only in-memory and D1-backed operational projections for outbox lag, delivery progress, and
procurement exceptions. Reporting administrators can read the cycle projection through the protected
`/api/v1/admin/operations/projection` route; projection data is derived from transactional tables and
does not duplicate source state. Focused workflow, DB, and API tests plus typechecks pass. Slice 011
is complete; the next slice is release hardening and production rehearsal.

### Next increment: Release hardening and production rehearsal

Scope:

- Add service bindings, rate limits, CSRF/origin controls, OpenAPI generation, and metrics around the
  protected API and async workers.
- Document backup/restore, Friday-cycle, load, provider-sandbox, and incident-response rehearsals.
- Keep operational checks deterministic and runnable without production credentials.

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
