# Carbon Food Delivery Production Architecture

Status: Accepted baseline

This document is the implementation handoff for the production system. It targets an initial launch of approximately 1,000 customers and capacity testing for 100,000 registered and 20,000 weekly-active customers.

## Product Contract

- Customers subscribe to Small, Medium, or Large weekly plans.
- Each plan has a weekly fee and included product-credit budget.
- Weekly charge is plan fee plus cart overage plus configured service-zone delivery fee.
- Unused weekly credit expires and does not become a wallet balance.
- Customers can pause, resume, skip, or cancel before the weekly cutoff.
- Carts lock Friday night for Saturday-Sunday delivery.
- SKU price is procurement cost plus markup; per-SKU markup overrides global markup.
- Cost, markup, fees, and order lines are snapshotted at lock and cannot be mutated afterward.
- Procurement is demand-driven from paid orders.
- Exceptional procurement failure requires an approved equal-value substitute or a line-item refund.
- The initial delivery model is an owned fleet with admin dispatch.

## Runtime Topology

```text
Browser / PWA
    |
    v
Next.js Web Worker
    |
    | Cloudflare Service Binding
    v
Hono API Worker
    |
    +--> D1
    +--> R2
    +--> KV / Cache API
    +--> Queue producers
    +--> Payment and notification adapters

Cron Trigger --> Workflow Worker --> Queues --> Jobs Worker
```

### Web Worker

Hosts the customer, admin, and deliveryman interfaces. It handles rendering, static assets, and public catalog caching. It does not access D1 directly and does not contain core business rules.

### API Worker

Uses Hono and exposes versioned `/api/v1` REST endpoints. It handles authentication, authorization, schema validation, application commands, short D1 transactions, R2 upload authorization, and signed webhook ingress.

Fastify is not used in the production Workers runtime. It is Node-first and its HTTP/plugin model creates unnecessary compatibility risk for a Fetch-native Cloudflare deployment. If Fastify becomes mandatory later, it belongs in Cloudflare Containers as a separate runtime.

### Jobs Worker

Consumes Queues for payment attempts, webhook processing, notifications, procurement manifests, packing exports, projections, reconciliation, and retention jobs. Every job is idempotent and retryable.

### Workflow Worker

Uses Cloudflare Workflows for Friday locking, payment retry schedules, substitution timeouts, procurement closeout, delivery-cycle closeout, and reconciliation. Workflow state is orchestration state; D1 remains the source of truth.

## Repository Structure

```text
apps/
  web/                 Next.js customer/admin/delivery UI
  api/                 Hono API Worker
  jobs/                Queue consumers and scheduled jobs
  workflows/           Cloudflare Workflow definitions

packages/
  domain/              Pure business rules and state machines
  application/         Use cases and command/query handlers
  contracts/           Zod schemas and OpenAPI definitions
  db/                  Drizzle schema, repositories, migrations
  auth/                Better Auth and authorization
  billing/             Provider-neutral billing orchestration
  notifications/       Email/SMS adapter contracts
  storage/             R2 upload and retention logic
  observability/       Logs, metrics, traces, request context
  config/              Environment parsing and feature flags
  ui/                  Shared design system
```

Dependency direction:

```text
Worker handlers -> application use cases -> domain rules
                -> repository/provider interfaces
                -> Cloudflare/provider implementations
```

The domain package must not import Hono, Next.js, D1 bindings, Workers APIs, or payment SDKs.

## Domain Boundaries

- Identity and access: users, sessions, roles, scoped admin permissions, MFA, consent.
- Catalog and pricing: SKUs, categories, units, images, cost history, markup rules, pricing versions.
- Plans and subscriptions: plan configuration, weekly credit, lifecycle, pause/skip/cancel rules.
- Weekly commerce: cycles, carts, cutoff, validation, price snapshots, order creation.
- Payments: attempts, provider references, webhook events, retries, refunds, reconciliation, ledger.
- Procurement: consolidated SKU demand, purchased quantities, quality checks, shortages, substitutions.
- Fulfillment: packing manifests, labels, readiness, exceptions.
- Delivery: zones, slots, capacity, dispatch assignments, delivery events, proof of delivery.
- Support and reporting: customer cases, exports, operational dashboards, audit views.

Each module owns its use cases, invariants, and repository interfaces. Cross-module changes happen through application commands or domain events rather than direct table manipulation.

## Payment Adapter

The system must not depend on Xendit or any other provider in the domain model. Billing owns the business process: amount calculation, weekly timing, retry policy, cancellation, ledger entries, and reconciliation. The provider adapter owns provider-specific API behavior.

```ts
interface PaymentProvider {
  readonly name: string;
  capabilities(): PaymentCapabilities;
  createCustomer(input: CreateCustomerInput): Promise<ProviderCustomer>;
  createPaymentMethod(input: CreatePaymentMethodInput): Promise<ProviderPaymentMethod>;
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(input: RefundInput): Promise<RefundResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedWebhook>;
  reconcile(input: ReconcileInput): Promise<ReconciliationResult>;
}
```

Capabilities are explicit. A provider may support tokenized charges, mandates, invoices, refunds, or reconciliation differently. Development uses a deterministic fake provider; each real provider gets sandbox contract tests.

## Data and D1 Rules

- D1 is the initial transactional source of truth.
- Use UUIDv7 or another globally unique sortable identifier.
- Store all money as integer centavos with explicit PHP currency.
- Include `customer_id` and `weekly_cycle_id` on commerce records.
- Add unique constraints for cycle orders, payment idempotency keys, webhook IDs, and relevant line identities.
- Use cursor pagination and bounded transactions; never hold a transaction open across provider calls.
- Use an outbox table for asynchronous work.
- Build operational projections for dashboards and reports instead of large synchronous joins.
- Store evidence, exports, and bulky historical artifacts in R2.
- Access D1 only through repositories so a future shard router can replace the single binding.
- Measure storage, query latency, write contention, queue lag, and weekly cutoff completion time.
- Rehearse commerce sharding before the single database reaches 50% of its applicable size or throughput limits.

## Cloudflare Guardrails

- Use Wrangler environments: development, staging, and production.
- Keep D1 migrations forward-only and reviewed.
- Use Service Bindings for internal Worker calls.
- Keep credentials in Workers Secrets.
- Use R2 signed URLs for media uploads and downloads.
- Use Cache API or CDN caching for public catalog reads.
- Use KV only for disposable cache, feature flags, and rate-limit state; never for orders, balances, prices, or payment state.
- Use Durable Objects only for coordination or capacity counters, never as the business database.
- Add a correlation ID to every request, job, webhook, and workflow step.
- Apply WAF and rate limits to authentication, checkout, webhooks, and admin endpoints.
- Enforce secure cookies, CSP, CSRF protection, origin checks, strict CORS, and session revocation.

## Authorization

Top-level roles remain `customer`, `deliveryman`, and `admin`.

Admin access is permission-scoped: `catalog`, `pricing`, `finance`, `procurement`, `packing`, `dispatch`, `support`, `reporting`, `staff`, and `superadmin`.

Authorization is server-side. Customers see only their own records. Deliverymen see only assigned delivery data. Sensitive admin actions require audit events and, where appropriate, recent authentication or MFA.

## Financial and Workflow Guardrails

- Never trust client-calculated prices, fees, credits, totals, roles, or statuses.
- Verify and deduplicate every payment webhook.
- Use idempotency keys for locking, order creation, charges, refunds, messages, and dispatch changes.
- Maintain an append-only payment and adjustment ledger with daily provider reconciliation.
- Orders cannot be edited after lock; corrections use explicit substitutions, adjustments, cancellations, or refunds.
- Model subscription, order, payment, procurement, and delivery transitions explicitly.
- Store timestamps in UTC and assign cycles using `Asia/Manila`.
- Audit price changes, refunds, role changes, exports, impersonation, procurement changes, and manual status transitions.
- Implement consent, access, correction, deletion eligibility, and export workflows for Philippine privacy obligations.
- Maintain tested backups, D1 exports, R2 retention, restoration procedures, and incident runbooks.

## Testing and Execution Cadence

Tests are layered to preserve iteration speed.

Per change:

- Run tests for the changed package.
- Run type checks for affected packages.
- Run contract tests when API schemas change.
- Run focused integration tests when repository or migration behavior changes.

At feature checkpoints:

- Run all unit tests, D1 integration tests, API contract tests, and one focused end-to-end journey.

Before release:

- Run complete E2E, security, provider sandbox, migration, backup/restore, Friday-cycle, and load tests.

Use Vitest, deterministic fixtures, fake clocks, provider fakes, table-driven state-machine tests, and concise output. Do not rerun unchanged suites after unrelated edits. Independent checks should run in parallel where possible.

The key load test simulates 20,000 weekly carts, Friday lock processing, payment webhook bursts, procurement aggregation, and weekend tracking traffic.

## Production Scope Boundaries

Included: customer web/PWA, admin operations console, deliveryman interface, catalog, pricing, subscriptions, weekly carts, payments, procurement, substitutions, packing, dispatch, delivery tracking, notifications, reports, audit, privacy controls, backups, and observability.

Deferred unless separately approved: native mobile apps, third-party courier integration, multi-country operation, marketplace vendors, loyalty, referrals, and complex promotions.

## Accepted Architectural Decisions

- Pure Cloudflare Workers runtime for web, API, jobs, and workflows.
- Hono for the production API.
- Next.js for the web experience.
- D1 initially, with repository abstractions and a rehearsed future shard path.
- REST/OpenAPI contracts.
- Better Auth for identity.
- Permission-scoped admin authorization.
- Capability-based payment adapters.
- D1 as source of truth, Queues as asynchronous transport, and R2 for large artifacts.
- Layered targeted testing instead of full-suite execution after every change.
