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
  orchestration, durable D1 metadata, and a protected API contract.
- Remaining: add payment-method listing/revocation administration flows.
- Add procurement aggregation, shortage substitution, packing manifests, and dispatch.
- Add queues, workflows, retry policies, and operational projections.

### Release hardening

- Add service bindings between web and API Workers.
- Add D1 migrations, R2 media policies, WAF/rate limits, and secrets.
- Add end-to-end customer checkout and admin operations journeys.
- Add backup/restore rehearsal, Friday-cycle rehearsal, load tests, and incident runbooks.
