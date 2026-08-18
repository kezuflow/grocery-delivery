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

## Next

### Catalog and pricing

- Add catalog entities for categories, SKUs, units, images, and active state.
- Add price history and markup rules with per-SKU override precedence.
- Add D1 schema and repository interfaces without exposing D1 to domain code.
- Add public catalog contracts and API reads with bounded cursor pagination.
- Add cache headers and invalidation behavior for public catalog responses.

### Identity and access

- Add Better Auth session boundaries and secure cookie configuration.
- Add role assignment, permission-scoped admin checks, and customer ownership checks.
- Add consent, session revocation, MFA hooks, and audit event contracts.
- Add API authentication middleware and protected route test fixtures.

### Plans and subscriptions

- Model Small, Medium, and Large plans with weekly credit budgets.
- Implement pause, resume, skip, and cancel transitions before the cutoff.
- Add subscription lifecycle commands and idempotency keys.
- Add customer-facing plan and subscription API contracts.

### Weekly commerce

- Add Asia/Manila cycle assignment and Friday cutoff logic with fake clocks.
- Add cart validation, credit application, overage, delivery fees, and price snapshots.
- Lock carts into immutable orders and publish outbox events.
- Add contract and integration tests for duplicate order creation and lock retries.

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
