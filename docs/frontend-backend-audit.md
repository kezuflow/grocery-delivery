# Frontend/Backend Production Audit

This document is the evidence matrix for `AUD-001`. It is not a second backlog. Delivery priority,
slice status, completion records, and resume points live only in `docs/implementation-backlog.md`.
Historical frontend planning is archived at
[`docs/archive/frontend-implementation-backlog-legacy.md`](archive/frontend-implementation-backlog-legacy.md)
for reference only; do not use it to plan new work.

## Classification

- `matched`: contract, backend, frontend, authorization, failure states, and local/staging evidence agree.
- `partial`: the core workflow works but a required production behavior or state is incomplete.
- `mismatch`: frontend and backend expose conflicting behavior or ownership.
- `missing`: a required contract, endpoint, persistence behavior, or UI workflow does not exist.
- `unverified`: implementation exists but required local or staging evidence is absent.

Severity is `P0` release blocker, `P1` production risk, `P2` product gap, or `P3` polish.

## Required Evidence Per Workflow

Record the route and feature owner; contract and typed client; API handler, application service,
repository, and migration; roles and permissions; server-owned values; idempotency and retry rules;
loading, empty, error, forbidden, disabled, offline, and success states; responsive/accessibility
evidence; request count and latency; correlation, audit, and metrics behavior; local fixture result;
staging result; classification; severity; and recommended vertical slice.

## Audit Inventory

| Area                    | Workflows to trace                                                                                 | Status     | Evidence                                                               |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| Public storefront       | Landing data, hero/banner fallback, plans, catalog preview, auth controls, media, SEO, performance | unverified | Pending AUD-001                                                        |
| Authentication          | Sign-up, verification, sign-in, password reset, MFA, session failure, role redirect                | unverified | Pending AUD-001                                                        |
| Marketplace             | Catalog, search, categories, availability, server prices, quantities, cart persistence             | unverified | Pending AUD-001                                                        |
| Cart                    | Read/write, validation, stale items, server totals, retry and empty states                         | unverified | Pending AUD-001                                                        |
| Checkout                | Plan/trial, address, window, coupon, payment readiness, quote, cutoff, idempotent order lock       | unverified | Pending AUD-001                                                        |
| Customer account        | Profile, subscription, payments, notifications, sessions, consent, export, deletion                | unverified | Pending AUD-001                                                        |
| Customer orders/support | History, ownership, detail, receipt, tracking, proof media, cancellation/refund, cases             | unverified | Pending AUD-001                                                        |
| Admin overview          | Projections, alerts, audit activity, permissions, degraded data                                    | unverified | Pending AUD-001                                                        |
| Admin catalog           | Admin reads, item/category visibility, pricing, edit/publish contract                              | partial    | Audit prototype shows reads; complete admin mutation model is missing  |
| Admin orders            | All-order read model, payment/fulfillment state, packing, dispatch, requests                       | partial    | Audit prototype composes feeds instead of a stable order read contract |
| Admin operations        | Procurement, packing, dispatch, support, refunds, promotions, reporting, configuration             | unverified | Pending AUD-001                                                        |
| Admin staff             | Directory, role assignment, permissions, MFA, audit history                                        | partial    | Role assignment exists; staff-directory read contract is missing       |
| Delivery staff          | Assignments, route, event transitions, failures, proof upload, offline queue, sync, history        | unverified | Pending AUD-001                                                        |
| Cross-cutting           | Auth cookies, origins, rate limits, CSP, caching, observability, migrations, OpenNext, rollback    | unverified | Pending AUD-001                                                        |

## Audit Output

For every non-matched row, add a finding with concrete file/route/endpoint evidence, user impact,
severity, dependencies, and the smallest complete vertical slice. Copy only the selected slice name,
status, acceptance checks, and resume point into the canonical implementation backlog.

## Admin Product Workspace Prototype Checkpoint

The legacy FE-015 admin draft is committed only as an audit prototype. It adds navigable catalog,
orders, and staff workspaces so the existing server contracts and capability gaps can be inspected;
it is not a complete vertical slice and must not be labeled production-ready.

Known backend and contract gaps:

- Catalog has server-owned read visibility but no complete admin edit/publish API contract beyond
  the existing launch-configuration workflow.
- Orders composes projection, procurement, dispatch, support, and order-request feeds; the server
  does not provide a stable all-orders read model.
- Staff supports superadmin role assignment and filtered audit history, but there is no staff
  directory read endpoint.

Verification still required before any matching vertical slice can be completed:

- Focused component tests for the catalog, orders, and staff feature surfaces.
- An API-client test for admin role assignment.
- A browser mutation test covering role-assignment confirmation, success, and failure behavior.
- Local and staging role/permission smoke tests for all three admin routes.
- A passing full Playwright run and `pnpm check` for this checkpoint commit.

The verification list above is a live handoff: remove items only when the evidence has actually
been produced, and retain any failures as audit findings with a resume point.
