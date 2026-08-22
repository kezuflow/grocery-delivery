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

| Slice | Area                                                            | Status   | Commit / resume point                                                                                       |
| ----- | --------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| 000   | Repository and domain foundation                                | complete | Existing history through `c3da0bc`                                                                          |
| 001   | API environment database bindings                               | complete | `03ef3bc`                                                                                                   |
| 002   | API runtime composition                                         | complete | `5f6a64e`                                                                                                   |
| 003   | Payment-method revocation administration                        | complete | `7229e08`                                                                                                   |
| 004   | Better Auth production integration                              | complete | `51a8de1`                                                                                                   |
| 005   | Web-to-API service binding and customer flows                   | complete | Complete through order creation                                                                             |
| 006   | Delivery addresses, serviceability, and weekly delivery windows | complete | Address geofence and weekly capacity selection complete                                                     |
| 007   | Procurement, shortages, substitutions, and packing              | complete | Demand aggregation, exceptions, substitutions, and manifests                                                |
| 008   | Dispatch, route planning, and driver assignments                | complete | Cycle-scoped admin dispatch assignments                                                                     |
| 009   | Deliveryman PWA and offline event sync                          | complete | Deliveryman assignments and idempotent offline event sync                                                   |
| 010   | Customer tracking, notifications, and delivery media            | complete | Customer tracking, idempotent notification adapter, and media URLs                                          |
| 011   | Jobs, workflows, retries, and operational projections           | complete | Durable outbox, workflow retries, and operational projections                                               |
| 012   | Release hardening and production rehearsal                      | complete | OpenAPI, origin checks, and rehearsal foundations complete                                                  |
| 013   | Production identity and account lifecycle                       | complete | Verified auth, admin role controls, and MFA enforcement complete                                            |
| 014   | Subscription onboarding and plan selection                      | complete | Onboarding, effective-cycle lifecycle, and confirmation UX complete                                         |
| 015   | Real payments and customer checkout                             | complete | `a5469f2` checkout pricing; campaign administration complete                                                |
| 016   | Immutable order fulfillment and cutoff enforcement              | complete | `b7fde24`; immutable snapshots, payable/packed dispatch, and order history complete                         |
| 017   | Admin operations console                                        | complete | Dashboard, operational mutations, campaigns, banners, audit/refunds, alerts, and support complete           |
| 018   | Deployable jobs, queues, workflows, and notifications           | complete | Staging queue retry/dead-letter/replay and durable workflow evidence complete                               |
| 019   | Customer fulfillment, support, and payment history              | complete | Approved requests, address book, receipts, and status messaging complete                                    |
| 020   | Delivery staff production workflow                              | complete | HMAC-signed R2 proof media, route actions, explicit failure reasons, and offline conflict handling          |
| 021   | Privacy, audit, compliance, and launch observability            | complete | Deletion requests, export/consent UI, audit evidence, and compliance runbooks                               |
| 022   | Staging launch rehearsal and go/no-go gate                      | blocked  | No-go evidence recorded; supported launch-data bootstrap added; identities, provider E2E, and owners remain |

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

Current increment: admin operations mutation controls and shared 429 handling

Completion record: the authenticated admin console now exposes permission-scoped controls for
procurement purchases, shortages, substitutions, packing manifests, dispatch assignments, and
campaign pause/resume/archive actions. Each mutation sends only validated command fields through
the same-origin API client, refreshes server-owned state after success, and surfaces stable API
errors without optimistic operational state. Rate-limited API and payment-provider responses are
surfaced immediately; durable queue retries remain owned by the queue adapter.
Focused web and billing tests, typechecks, lint, and the production web build pass.

Next resume point: add campaign draft creation/finance approval UX, banner content and media
management, public active-promotion reads, and admin customer/support/refund/audit surfaces.

Current increment: campaign drafting and finance-controlled activation

Completion record: marketing administrators can create server-validated draft campaigns from the
admin console using normalized coupon codes, bounded fixed discounts, and scheduled dates. Existing
campaigns expose pause, resume, and archive actions; activation remains permission-scoped to the
finance role in the API, so the browser cannot publish price-affecting rules by itself. The web
client validates both mutation requests and response envelopes, and refreshes dashboard state after
successful commands.

Next resume point: add banner content and media management, public active-promotion reads, and
admin customer/support/refund/audit surfaces.

Current increment: promotional banners, dedicated media signing, and public active reads

Completion record: promotion banners now have forward-only D1 persistence, validated placement,
schedule, CTA, accessibility, and dedicated `promotions/` object-key boundaries. Marketing admins
can create and list drafts, finance admins alone can activate them, and pause/archive changes bump
the cache version. Public placement reads filter status and schedule server-side, issue short-lived
download URLs through a signer separate from delivery proof media, and return cache-control plus ETag
metadata. Upload requests enforce supported image types, a 5 MB bound, bounded dimensions, and
promotion-only object keys. Storefront hero content consumes only the validated active response and
falls back safely when banners are unavailable. Focused contract, repository, storage, API, and web
checks pass.

Next resume point: add durable impression/click analytics, then continue admin customer/support,
refund, audit, and alert surfaces.

Current increment: bounded promotion banner analytics

Completion record: impression and click events now cross a dedicated analytics repository boundary.
The API accepts only a bounded banner ID, event ID, and event type, records events only while the
banner is active, deduplicates retries by client event ID, and returns accepted/duplicate state
without exposing campaign pricing or status controls. Migration `0029` adds the durable event table
and focused contract/repository coverage protects inactive and duplicate behavior.

Next resume point: add customer/support/refund/audit admin surfaces, then continue deployable
workers and launch observability.

Current increment: permission-scoped audit and refund administration

Completion record: reporting administrators can read bounded server-owned audit history through a
new repository read boundary, while finance administrators can issue refunds from the existing
idempotent payment command. The admin dashboard now loads only surfaces covered by the current
permission set, avoiding unrelated 403 responses blanking the entire console. Refund retries keep
their idempotency key until success, and API errors retain the correlation ID for actionable support
and incident tracing. Focused typechecks, lint, and existing API refund coverage pass.

Next resume point: add customer/support case workflows and alert projections, then continue Slice
018 deployable queue/cron/workflow entrypoints.

Current increment: deployable jobs and workflow worker shells

Completion record: `@carbon/jobs` now exports a framework-neutral worker shell that connects the
existing outbox dispatcher and queue handler to scheduled and queue-triggered entrypoints. Wrangler
configuration declares the D1 binding, outbox queue producer/consumer, bounded retries, and a
five-minute dispatch cron. A workflow Wrangler configuration declares the weekly operations binding
while the existing workflow class retains explicit step retries and correlation-aware input.
Focused jobs tests and the complete monorepo check pass.

Next resume point: wire real D1/Queue factories and notification/payment processors in deployed
environments, then add customer support cases and alert projections.

Current increment: concrete D1, Queue, service-binding, and 429-aware job runtime

Completion record: the jobs runtime now composes D1 outbox claims, Cloudflare Queue scheduled and
batch handlers, and an internal event-processor service binding. Event processing surfaces a 429
immediately and hands retry ownership back to the outbox retry/dead-letter adapter.
Cloudflare worker types, runtime composition tests, and the jobs package checks pass.

Next resume point: add notification/payment/retention processors and operational alert projections,
then continue customer fulfillment and support history.

Current increment: configurable operational alert projections

Completion record: reporting projections now derive deterministic alerts for dead-lettered and stale
outbox work, delivery failures, procurement shortages, and packing exceptions. Alert thresholds are
positive, environment-configurable operational settings with safe defaults; the existing reporting
permission protects the response. The admin dashboard renders severity, observed value, threshold,
and actionable empty states without inventing operational status in the browser. Focused application,
API, contract, and web checks pass.

Next resume point: add notification/payment/retention event processors, then customer support cases
and fulfillment history.

Current increment: customer and support-admin case workflow

Completion record: customers can create idempotent support cases, list only their own requests, and
see server-owned status updates in the account page. Support administrators can read the bounded
queue and transition cases through open, in-progress, and resolved states. Migration `0030` adds
forward-only D1 persistence with a customer/idempotency uniqueness boundary, while API and web
contracts validate every response. Focused DB, API, and web checks pass.

Next resume point: add explicit notification/payment/retention processors, then complete remaining
customer fulfillment and delivery-staff production controls.

Current increment: explicit outbox processor lanes

Completion record: jobs now classify order/delivery events into notification, payment, and retention
processor lanes and send the server-owned lane through the internal event-processor binding. Unknown
event types fail before acknowledgement, while the existing outbox claim, retry, and dead-letter
path remains authoritative. Focused jobs tests and the complete monorepo check
pass.

Next resume point: add concrete provider-backed notification/payment/retention handlers and finish
delivery-staff production controls.

Current increment: delivery event sequencing and failure reasons

Completion record: delivery events now follow the server-enforced sequence picked-up, arrived, then
delivered or failed. Terminal assignments reject further events, failed deliveries require one of a
bounded set of reason codes, and D1 stores the reason in migration `0031`. Offline event IDs remain
idempotent, while the delivery console exposes only the next valid actions. Focused domain, DB, API,
contract, and web checks pass.

Next resume point: add route/customer minimum-data projections, real storage retention handlers, and
the remaining compliance and staging go/no-go evidence.

Current increment: persisted notification preferences

Completion record: customers now have server-owned delivery-update and marketing notification
preferences behind protected GET/PUT contracts. Migration `0032` adds one preference record per
customer, with delivery updates enabled and marketing disabled by default. Repository and API tests
cover customer isolation and validated updates.

Next resume point: complete provider-backed processors, storage retention, compliance evidence, and
staging rehearsal.

Current increment: audit coverage for support and notification preferences

Completion record: support case creation/status transitions and notification preference changes now
write actor, target, correlation, timestamp, and status metadata through the existing audit boundary
when identity persistence is available. The account and support-admin workflows therefore retain
the same reporting history as other sensitive operations.

Current increment: deliveryman minimum-data route projection

Completion record: deliveryman assignment reads now join only the locked order's immutable delivery
snapshot and expose a deterministic route sequence, recipient name and phone, delivery address, and
instructions for the assigned driver and active cycle. The delivery console renders this server-owned
route data without exposing commerce totals, payment references, or unrelated customer records.

Next resume point: implement real R2 media access and retention cleanup, then provider-backed job
handlers and launch compliance evidence.

Completion record: delivery media repositories now expose bounded retention queries and idempotent
metadata deletion, while the storage package provides an R2 object-store adapter and a retention
handler that removes expired proof objects before their database records. This is ready for a
scheduled retention lane; signed R2 upload/download URL integration remains the next storage step.

Next resume point: wire the R2 bucket and signed URL implementation into the API and jobs runtime,
then add concrete provider-backed notification/payment/retention event handlers.

Completion record: the rehearsal gate now inspects staging and production API configuration and
rejects fake or disabled payment providers, zero delivery pricing, and missing serviceability
postal-code configuration. Staging and production now carry explicit non-zero delivery pricing and
postal-code values for launch rehearsal.

Completion record: deployed API identity email now uses the Cloudflare Email Service `send_email`
binding with `EMAIL_FROM=no-reply@getscenepass.com`. Jobs and workflow Wrangler environments now have
staging and production names, D1 bindings, environment-specific outbox queues, API service bindings,
and deploy scripts. The remaining launch work is Cloudflare account setup, domain verification, queue
creation, secret provisioning, migrations, and the staging rehearsal.

Configuration update: API and web custom domains now use `getscenepass.com` subdomains. The fake
notification endpoints were removed from deployed environments; `NOTIFICATION_ENDPOINT` must only be
set when a real outbound notification provider is available.

Configuration update: the approved bootstrap administrator email is `no-reply@getscenepass.com` in
staging and production.

Tooling update: the double-clickable Worker-secret launcher now uses the compatible disposable
`RandomNumberGenerator.Create().GetBytes()` API for Windows PowerShell and was verified by uploading
the staging Better Auth and event-processor secrets to the API and jobs Workers.

Next resume point: add named launch owners and measured restore/rollback evidence, then complete
provider-backed event handlers and customer fulfillment workflows.

Completion record: dispatch assignment creation and finance refund mutations now write optional
audit records with actor, target, correlation, timestamp, and operation metadata. API coverage
asserts both sensitive paths retain their audit trail when identity persistence is configured.

Next resume point: finish remaining account export/deletion and consent evidence, then wire the
provider-backed event handlers and customer fulfillment gaps.

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

Current increment: authenticated event-processor handoff

Completion record: jobs now propagate a server-owned event-processor token to the API service
binding, and the API exposes a framework-independent internal outbox endpoint that validates the
processor lane and complete message shape before dispatching to an injected handler. Deployed
staging and production environments must provision `EVENT_PROCESSOR_TOKEN` through Wrangler
secrets; local and test environments may omit it. Invalid, missing, unavailable, and failed
processor requests return correlation-aware errors, while successful dispatches return `202`.
Focused API/jobs tests, typechecks, lint, and the retention test lint correction pass.

Completion record: the API runtime now composes concrete notification, payment-reconciliation, and
media-retention handlers when their configured provider boundaries are available. Notifications
use an HTTPS idempotent HTTP transport, reconciliation runs through the existing provider-neutral
PayMongo/D1 service, and retention deletes expired R2 objects before D1 metadata. Jobs schedule one
previous-day reconciliation event and one daily retention event through the durable outbox with
deterministic IDs, so repeated cron runs are safe. Focused API, jobs, DB, notification, storage,
and application checks pass.

Completion record: outbox repositories now expose an idempotent dead-letter replay boundary that
resets only retry state while preserving the original event ID and payload. Jobs coverage verifies
that replayed events retain their idempotency identity, and the queue retry/dead-letter runbook
records the required staging evidence. A live rehearsal remains blocked until the configured
staging Worker and queue are deployed.

Next resume point: deploy staging and run the queue retry/dead-letter rehearsal with measured
evidence, then add provider delivery receipts and notification preference enforcement.

Completion record: notification processors now treat persisted delivery-update preferences as a
server-owned gate, defaulting to delivery when no preference row exists. Accepted provider responses
return a receipt reference and timestamp, and D1 stores the first receipt per outbox idempotency key
through migration `0033`. Focused API, notification, and DB coverage protects suppression and
idempotent receipt persistence.

Next resume point: deploy staging and run the queue rehearsal with measured evidence, then validate
provider receipt reconciliation and complete remaining customer fulfillment history gaps.

Completion record: added a staging-only Ubuntu/WSL deployment script that installs the pinned Node
and pnpm toolchain when needed, builds OpenNext in a temporary Linux filesystem, verifies the Worker
bundle, authenticates Wrangler if required, and deploys only `app-staging.getscenepass.com`.

Final completion record: Slice 018 is complete. The staging API, jobs, and workflow Workers are
deployed at the configured `getscenepass.com` origins with current D1 migrations, required secret
names, one queue producer/consumer pair, and the weekly Workflow binding. The jobs service-binding
route now targets the real internal API path and preserves bounded processor errors for retry and
dead-letter evidence. PayMongo reconciliation uses the payments collection, accepts provider Unix
timestamps and paid status, and avoids an illegal platform-fetch receiver binding. A measured
staging rehearsal published one synthetic event, retried it with approximately 30/60/120/240 second
delays, dead-lettered it at attempt 5, replayed the same event ID, and published it successfully
without a duplicate row. The Friday 18:05 Asia/Manila cron is deployed, and a staging Workflow
instance completed all five durable steps in order while preserving cycle and correlation metadata.
Focused checks and the complete `pnpm check` pass all 55 tasks.

Post-completion review note: Slice 018 remains complete against its deployable queue, retry,
dead-letter, replay, scheduling, correlation, and idempotency acceptance checks. Live delivery SMS,
push, or email is intentionally not configured through `NOTIFICATION_ENDPOINT`; the current
operating model may use driver phone calls, and an outbound provider can be selected later without
changing the durable notification boundary. Non-blocking follow-ups are to connect the five weekly
Workflow steps to concrete operational actions when those actions are ready for automation, add
pagination to PayMongo reconciliation before a daily window can exceed 100 provider payments, and
make API test-session expiry fixtures independent of the wall clock so fresh direct test runs do not
eventually fail after their fixed expiration dates.

Next resume point: begin Slice 019 with customer fulfillment and payment history. Prioritize
customer-visible payment records and receipts, substitution decisions, cancellation/refund requests,
and proof-of-delivery media reads while preserving customer isolation and server-owned statuses.

### Slice 019: Customer fulfillment, support, and payment history

Status: complete

Scope:

- Add customer order history, receipts, payment history, tracking, proof-of-delivery media, delivery
  notifications/preferences, substitution approval, cancellation/refund requests, multiple saved
  addresses, support/contact workflow, and clear cutoff/payment/delivery status messaging.

Acceptance checks:

- Customers see only their own orders, payment records, media, substitutions, and support requests.
- Every state shown in the web app comes from validated server responses; no optimistic commerce
  totals or statuses are invented client-side.
- Notification preferences and support requests are persisted, auditable, and retry-safe.

Current increment: customer order history in the account experience

Completion record: the existing customer-scoped `/api/v1/orders` response is now consumed by the
web account loader through the shared Zod contract and rendered by a dedicated order-history
component. Customers see only server-returned locked orders, totals, payment state, cycle, and lock
date; the browser does not derive commerce values or status. Focused web tests, typecheck, and lint
pass.

Next resume point: add customer order detail/tracking and proof-of-delivery views, then continue
substitution decisions and cancellation/refund requests.

Completion record: the account experience now hydrates each customer-owned order with its validated
tracking snapshot and signed proof-of-delivery media list through the existing protected APIs. A
dedicated fulfillment component renders server-owned delivery status, latest event, and short-lived
proof links; missing detail for one order remains isolated instead of inventing a status or blanking
the entire account. Focused web coverage includes populated tracking/media hydration, and the full
`pnpm check` passes all 55 tasks.

Completion record: customer cancellation and refund requests now use a customer-scoped durable
request repository, validated contracts, and protected API routes. The server verifies order
ownership, payment state, dispatch assignment, duplicate pending requests, and idempotency
fingerprints before accepting a request. Accepted requests remain pending for operational review
and write an audit event; the account experience renders the server-owned request status and offers
a modular request form. Focused API, repository, contract, and web checks pass.

Completion record: customer substitution proposals now link an operational procurement proposal to a
specific customer order and original SKU. Protected customer list and decision routes enforce
customer ownership, pending-only decisions, cycle and line eligibility, idempotency fingerprints,
procurement status synchronization, and audit events. The account experience renders server-owned
proposals with accept/reject actions. Focused domain, contract, repository, API, and web checks pass.

Next resume point: connect approved cancellation/refund requests to finance and durable order state
transitions.

Completion record: finance/support administrators now list and decide pending customer order
requests through permission-scoped APIs. Approved cancellations persist a canceled order state that
remains visible in customer history, while approved refunds resolve the successful order charge and
remaining refundable amount entirely on the server with a stable request idempotency key. Both
paths persist final request status and audit evidence.

Completion record: customers can save multiple serviceable delivery addresses and select the active
checkout address through a forward-only D1 address-book migration while the original selected-address
endpoint remains compatible. The account now renders modular receipts joined from validated order
and payment history, explicit order/payment/delivery labels, and the server-returned Manila cutoff.
OpenAPI was regenerated, focused authorization/idempotency/persistence tests pass, and `pnpm check`
passes all 55 tasks.

Next resume point: begin Slice 020 with delivery-staff route ordering and minimum-data assignment
projections, then add contact actions, real R2 proof storage, validated event sequencing/failure
codes, and offline conflict resolution.

### Slice 020: Delivery staff production workflow

Scope:

- Add customer name/address/phone/instructions, route ordering and map integration, contact/support
  actions, required event sequencing, real R2 proof-of-delivery storage, failure reason codes,
  offline conflict resolution, and delivery privacy/safety controls.

Acceptance checks:

- Delivery staff see only assigned orders and the minimum data required for the current route.
- Event sequencing and failure reasons are validated server-side and remain idempotent offline.
- Proof media is stored and retrieved through real signed storage URLs with retention controls.

Completion record: the deliveryman console now exposes only the server-owned route projection and
adds call, map, and support actions, explicit failure-reason selection, camera/file proof capture,
and conflict-aware offline event flushing. Delivery media metadata remains idempotent and bounded;
deployed API runtimes now issue short-lived HMAC-signed first-party upload/download URLs, verify
expiry and signatures before accessing the private R2 bucket, enforce content type and 10 MB size
limits, and preserve retention cleanup. The Worker secret setup script provisions
`MEDIA_SIGNING_SECRET` alongside Better Auth and event-processor credentials. Focused storage/API
tests, API and web typechecks, lint, and `git diff --check` pass.

Next resume point: begin Slice 021 with consent/export/deletion evidence, complete audit coverage
for remaining sensitive operations, and add launch observability and abuse-response runbooks.

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

Completion record: customer account privacy now includes server-owned export data, consent history,
deletion eligibility, and an idempotent deletion-request command that records actor, target, reason,
correlation, and timestamp without deleting records still required for fulfillment or finance.
Sensitive lifecycle, payment, dispatch, support, and preference operations retain the existing audit
boundary. Secret rotation, security-header verification, abuse monitoring, and operational-alert
ownership/response runbooks are checked by the credential-free compliance rehearsal. Focused contract,
API, and web tests plus compliance/incident rehearsal checks pass.

Next resume point: begin Slice 022 by running the complete staging rehearsal, recording timed
restore/rollback evidence and named go/no-go owners, then close any environment configuration gaps.

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

Blocked rehearsal record: the 2026-08-21 staging rehearsal is recorded in
`docs/runbooks/staging-launch-rehearsal-2026-08-21.md`. All 36 migrations are applied; staging API,
web, jobs, workflow, queue, secrets, R2 bindings, health, origin protection, security headers,
20,000-cart deterministic capacity, a 200-request read-only smoke pass, timed D1 restore, and timed
web rollback were verified. A mock superadmin, customer, and delivery-staff candidate now exist in
staging, and all three have completed email verification; administrator TOTP enrollment remains
pending. The result is still no-go because staging has zero catalog categories, active SKUs, delivery
windows, and orders, so customer-to-delivery and PayMongo sandbox E2E cannot run. The staging web
Worker now includes the password-reset form after a callback regression was fixed and deployed.
Production Workers and required queue/R2 resources are not provisioned, and named human go/no-go
owners are not recorded.

Bootstrap increment: the protected `PUT /api/v1/admin/launch-configuration` route now gives an
MFA-verified superadmin a supported, idempotent path to load approved catalog categories, SKU
procurement costs/markups, and delivery windows. The server derives PHP prices and price-history
records, persists the configuration atomically with cache invalidation and audit evidence, and
rejects client-owned final prices. The operations console exposes the same manifest import surface
only to superadmins. This is a data-bootstrap mechanism, not staging data: no launch values were
invented or applied by this increment.

Resume point: enroll administrator TOTP and use the
superadmin session to assign the delivery candidate. Import the labelled mock-only manifest, then run
the authenticated PayMongo/order/operations/delivery flow and mutation load fixture. Repair the WSL
OpenNext build/deployment before testing the updated web flow; name operational owners; then provision
and verify the production resource inventory. Do not mark Slice 022 complete until the evidence
document contains those results and a final go decision.

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

## Unified Vertical-Slice Development Truth

This file is the single source of truth for backend and frontend delivery. The old split between
platform slices and frontend slices is retired. Every new slice must deliver one user-visible or
operator-visible outcome across the contract, server behavior, persistence, typed web client, UI,
authorization, tests, documentation, and staging verification.

The frontend route history and completed FE slices are merged below under
`Frontend Vertical-Slice Ledger`. Do not create or maintain a separate frontend backlog. The
platform/API launch gate in Slice 022 remains independently blocked until its documented staging
evidence exists.

### Vertical-slice rules

- Keep exactly one slice `in progress` and small enough to review, test, deploy, and roll back.
- Start with the user journey and its acceptance evidence, then define or verify the shared
  contracts before implementing the UI.
- Trace every read and write from route to API handler, application service, repository, and
  migration. Missing backend capability is a contract gap, not a frontend placeholder.
- Keep prices, totals, availability, statuses, roles, permissions, dates, and ownership decisions
  server-owned. Use idempotency keys for retriable writes.
- Include loading, empty, error, forbidden, offline, disabled, retry, success, responsive,
  keyboard, accessibility, and observability states where applicable.
- Verify with deterministic local fixtures and staging smoke tests. A slice is not complete until
  focused checks, `pnpm check`, deployment, and the relevant browser checks pass.
- Update this file with scope, acceptance checks, completion evidence, and resume point in the same
  conventional commit as implementation changes.

### Audit-first operating model

Before starting the next product slice, maintain a route-and-contract audit covering the public
landing page, marketplace, cart, checkout, account, orders, support, admin workspaces, and delivery
workflow. Record each item as `matched`, `partial`, `mismatch`, `missing`, or `unverified` with
severity and local/staging evidence in `docs/frontend-backend-audit.md`.

The current uncommitted FE-015 work is audit evidence and must not be treated as complete until its
admin catalog, order read model, and staff-directory capabilities match real server contracts.

### Unified next-slice queue

| Slice   | User outcome                                              | Status  | Completion gate                                                             |
| ------- | --------------------------------------------------------- | ------- | --------------------------------------------------------------------------- |
| AUD-001 | Cross-role frontend/backend production audit              | next    | Every route and workflow classified with local and staging evidence         |
| VS-001  | Highest-severity audited journey mismatch                 | planned | Contract, backend, frontend, tests, deployment, and smoke evidence complete |
| VS-002+ | Remaining audit findings in severity and dependency order | planned | One independently deployable user outcome per slice                         |

Do not pre-name VS-001 from assumption. AUD-001 must identify and rank the actual mismatch first.

## Frontend Vertical-Slice Ledger

### Implemented Baseline To Preserve

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
| FE-015 | Admin catalog, orders, and staff product surfaces  | planned  | Audit findings       |

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
The next increment is AUD-001: the cross-role frontend/backend production audit.

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

Audit note: the current FE-015 implementation remains an uncommitted draft. Catalog lacks a complete
admin edit/publish contract, orders lacks a stable all-orders read model, and staff lacks a directory
read contract. Re-scope these capabilities into contract-first vertical slices after the audit.

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

FE-014 is complete and deployed as the polished public storefront. The next resume point is AUD-001,
the cross-role frontend/backend production audit. Replace the interim Unsplash assets only when
ImageGen access is available, following the documented handoff.

### Unified Resume Point

The next development increment is the cross-role frontend/backend production audit. Do not start a
new broad backend or frontend slice. Convert audit findings into one end-to-end vertical slice at a
time, beginning with the highest-severity user journey mismatch.

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
