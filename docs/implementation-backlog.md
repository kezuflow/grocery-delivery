# Implementation Backlog

This backlog turns the accepted production architecture into dependency-ordered
implementation milestones. Each milestone should land with focused tests and
keep the dependency direction from workers to application to domain intact.

## Completed

### Platform foundation

- PHP centavo money value object with overflow and arithmetic checks.
- Role and permission vocabulary for customer, deliveryman, and admin access.
- Runtime environment and CORS origin parsing.
- Correlation ID validation and structured logging primitives.
- Zod system response/error contracts.
- Hono API Worker with `/health` and `/api/v1/health`.
- Wrangler development, staging, and production environments for the API.

### Catalog and pricing

- Catalog entities for categories, SKUs, units, images, and active state.
- Effective-dated price history and markup rules with per-SKU override precedence.
- Forward-only D1 catalog schema plus read and pricing repositories isolated from domain code.
- Public catalog contracts and API reads with bounded cursor pagination and category filtering.
- Cache headers, conditional ETags, and D1-backed cache-version invalidation on price changes.

## Next

### Identity and access

- Session resolver boundary, secure HTTP-only cookie policy, role assignment validation,
  permission-scoped admin checks, customer ownership checks, consent/audit records, and
  public identity contracts.
- Protected `/api/v1/me` route with active-session resolution and test fixtures.
- Better Auth session adapter with secure cookie and bearer-token resolution, D1 persistence for
  users, sessions, roles, consents, audit events, and MFA challenges, session revocation storage,
  and centralized middleware on all protected application routes.
- Remaining: configure the production Better Auth instance and add provider-specific sign-in
  handlers.

### Plans and subscriptions

- Admin-configurable plan models with seeded Small, Medium, and Large defaults
  (PHP 699/699, 999/999, and 1399/1399 weekly fee/credit), slug validation, and display order.
- Pause, resume, skip, and cancel transitions before the cutoff.
- Application subscription commands with idempotency-key replay and conflict handling.
- Customer-facing plan contracts, cacheable `/api/v1/plans`, and protected subscription actions.
- Forward-only D1 schema for plans, subscriptions, and idempotency records.
- Durable D1 subscription reads/upserts and immutable idempotency result snapshots.
- Protected customer current-subscription reads with ownership checks and private caching policy.
- Atomic D1 subscription command/idempotency persistence and replay snapshots.
- Permission-scoped admin plan writes with D1 persistence, cache-version invalidation,
  and public ETag validation.
- Independent pricing proposals with finance approval, self-approval protection, rejection
  reasons, atomic approved-plan/cache/audit persistence, and decision API contracts.

### Weekly commerce

- Asia/Manila cycle assignment and deterministic Friday cutoff logic with fake clocks.
- Cart validation, server-side credit application, overage, delivery fees, and immutable price snapshots.
- Idempotent application-level cart locking into immutable orders with an outbox publisher boundary.
- Focused tests for duplicate lock replay, conflicting idempotency keys, and lock totals.
- Durable D1 order/line snapshots and atomic order-plus-outbox writes are now available;
- Customer order contracts and protected `/api/v1/orders` route now resolve server-side prices,
  credits, delivery fees, and subscription ownership.
- Persistent customer cart drafts with D1 and in-memory repositories, protected `GET`/`PUT`
  `/api/v1/cart` routes, catalog price resolution, duplicate/unavailable SKU validation, and
  saved-cart checkout with post-lock cart clearing.
- Live D1 lock retry and concurrent idempotency integration tests now cover durable order/outbox
  behavior.

### Billing and fulfillment

- Provider-neutral payment capabilities and adapter interfaces with a deterministic fake
  provider for idempotent customers, payment methods, charges, refunds, signed webhooks, and
  reconciliation fixtures.
- Durable payment attempt, webhook deduplication, refund, and append-only ledger storage with
  forward-only D1 migration and repository implementations.
- Provider-neutral charge/refund orchestration now enforces idempotency fingerprints, persists
  successful ledger entries, and applies signed webhook state transitions exactly once.
- Protected customer charge and signed provider webhook ingress are now exposed through the API
  worker with server-side order total resolution.
- Provider reconciliation now compares persisted charges/refunds with provider activity, stores
  deterministic discrepancy records, and exposes a clock-controlled jobs-worker adapter.
- Finance-authorized refund administration is now exposed through the API with idempotency,
  provider-backed execution, public response contracts, and append-only ledger coverage.
- Customer tokenized payment-method registration now has provider-only token handling, idempotent
  orchestration, durable D1 metadata, and protected create/list API contracts.
- Remaining: add payment-method revocation administration flows.
- Add procurement aggregation, shortage substitution, packing manifests, and dispatch.
- Add queues, workflows, retry policies, and operational projections.

### Operational delivery expansion

The first operational release targets more than 1,000 weekend drops with admin-controlled
dispatch, Saturday/Sunday delivery, broad morning/afternoon windows, and an offline-capable
deliveryman PWA. Routing and geocoding remain provider-neutral adapters. Packages use QR labels;
photo proof is the default delivery completion policy, with OTP/signature support configurable
later. Drivers report failed attempts and dispatchers decide retry, Sunday reassignment,
reschedule, or return-to-depot.

#### Phase 1: delivery foundation

- Add structured customer addresses with Philippine address fields, landmark/instructions,
  latitude/longitude, geocode confidence, and service-zone validation.
- Add weekly delivery cycles, Saturday/Sunday windows, capacity reservations, and immutable order
  snapshots for cycle, address, zone, delivery day, and window.
- Require a serviceable address and an idempotent capacity reservation before an order can lock.
- Add customer APIs for address management, serviceability, available windows, and delivery
  selection.

#### Phase 2: procurement and packing

- Aggregate paid-order SKU demand by cycle and expose purchased quantity and quality-check state.
- Model shortages and admin-approved equal-value substitutions or line-item refunds.
- Generate packing manifests and package records with human-readable codes and QR payloads.
- Add package state transitions for packed, loaded, exception, delivered, and returned.
- Add exception-first admin views for shortages, unpaid orders, capacity failures, and unassigned
  work.

#### Phase 3: dispatch and route planning

- Model driver accounts, delivery permissions, vehicles, package capacity, shifts, route plans,
  route stops, publication state, and idempotent assignments.
- Add provider-neutral geocoding, travel-time matrix, and route-optimization interfaces.
- Optimize asynchronously through workflows/jobs using driver shifts, vehicle/package capacity,
  zones, delivery windows, travel times, and depot start/end constraints.
- Add admin review, manual adjustment, publish, reassign, and reopen operations with audit events.

#### Phase 4: deliveryman PWA

- Add a role-scoped mobile workflow for shift start, vehicle/load checklist, assigned routes,
  package scans, map launch, masked customer contact, delivery notes, and route progress.
- Add delivered and failed-attempt events with photo proof, server timestamp, stop identity,
  uploader identity, and approximate device location when available.
- Queue delivery events offline and synchronize them idempotently with explicit conflict states.
- Keep drivers limited to assigned delivery data; never expose payment details, unrelated customers,
  or unassigned routes.

#### Phase 5: tracking and notifications

- Add customer order timelines, delivery day/window, route status, delay state, substitution or
  refund decisions, and completion status.
- Add idempotent email/SMS/push adapters and outbox jobs for payment, shortage, route, delay, and
  completion notifications.
- Store delivery photos in R2 with presigned upload authorization, metadata in D1, and retention
  policies.

#### Cross-cutting prerequisites

- Add `weekly_cycle_id`, delivery snapshots, and operational projections before route planning.
- Resolve charges from server-owned payment methods and provider customer records; do not trust
  client-supplied provider references.
- Include a non-reversible token digest in payment-method idempotency fingerprints without storing
  raw tokens, and enforce cumulative refund limits in billing.
- Validate persisted admin permissions, consume and retry outbox events, and split the API route
  composition before adding the operational surface.
- Add OpenAPI generation, rate limits, CSRF/origin controls, production Better Auth configuration,
  metrics, backup/restore rehearsal, and provider sandbox contract tests.

#### Operational acceptance tests

- Address serviceability, geocode confidence, cycle cutoff, and concurrent window-capacity tests.
- Procurement aggregation, shortage approval, substitution/refund, package state, QR scan, and
  route-capacity/shift/window tests.
- Driver assignment authorization, offline event replay, failed-delivery decisions, proof upload,
  and outbox retry/dead-letter tests.
- End-to-end coverage from address and window selection through lock, payment, procurement, packing,
  dispatch, delivery proof, and customer tracking.

### Release hardening

- Add service bindings between web and API Workers.
- Add D1 migrations, R2 media policies, WAF/rate limits, and secrets.
- Add end-to-end customer checkout and admin operations journeys.
- Add backup/restore rehearsal, Friday-cycle rehearsal, load tests, and incident runbooks.
