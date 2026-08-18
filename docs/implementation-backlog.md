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
- Remaining: wire the Better Auth provider, persist sessions/roles/consents/audit events,
  add revocation storage and MFA hooks, and apply authentication middleware to all protected
  application routes.

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
- Remaining: admin pricing approval workflow and audit event persistence for plan changes.

### Weekly commerce

- Asia/Manila cycle assignment and deterministic Friday cutoff logic with fake clocks.
- Cart validation, server-side credit application, overage, delivery fees, and immutable price snapshots.
- Idempotent application-level cart locking into immutable orders with an outbox publisher boundary.
- Focused tests for duplicate lock replay, conflicting idempotency keys, and lock totals.
- Remaining: durable D1 order/outbox transaction, customer cart/order API contracts and routes,
  and lock retry integration tests against D1.

### Billing and fulfillment

- Add provider-neutral payment interfaces and deterministic fake provider.
- Add payment attempts, webhook deduplication, refunds, and append-only ledger entries.
- Add procurement aggregation, shortage substitution, packing manifests, and dispatch.
- Add queues, workflows, retry policies, and operational projections.

### Release hardening

- Add service bindings between web and API Workers.
- Add D1 migrations, R2 media policies, WAF/rate limits, and secrets.
- Add end-to-end customer checkout and admin operations journeys.
- Add backup/restore rehearsal, Friday-cycle rehearsal, load tests, and incident runbooks.
