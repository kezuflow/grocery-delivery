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
| 005   | Web-to-API service binding and customer flows                   | next     | Depends on stable API runtime and auth configuration                 |
| 006   | Delivery addresses, serviceability, and weekly delivery windows | planned  | Depends on customer identity and order snapshots                     |
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

Keep D1 access behind the API Worker. Add the service binding, typed web client, authenticated
customer shell, and end-to-end plan/cart/subscription journeys only after the API and auth runtime
contracts are stable.

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
