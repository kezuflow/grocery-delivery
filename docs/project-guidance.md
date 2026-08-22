# Project Guidance

Status: accepted repository guidance

This document is the index and coverage audit for engineering guidance in Carbon Food Delivery. It
does not replace the product backlog, frontend/backend audit, architecture, or runbooks. Its job is
to tell contributors and coding agents which source governs each decision and to expose guidance
gaps before they become implementation drift.

## Source-Of-Truth Hierarchy

Use the narrowest applicable source. When two sources conflict, stop and resolve the conflict in
the same change rather than silently choosing one.

1. `AGENTS.md` and the nearest nested `AGENTS.md`: mandatory repository working rules.
2. `docs/implementation-backlog.md`: active `AUD-*`/`VS-*` scope, status, completion evidence, and
   resume point.
3. `docs/frontend-backend-audit.md`: route-and-contract evidence and mismatch classification.
4. `docs/architecture/production-plan.md`: accepted product and runtime architecture.
5. `.codex/skills/carbon-vertical-slice/SKILL.md`: task workflow and concern routing.
6. `docs/frontend-standards.md`, `CONTRIBUTING.md`, and `docs/runbooks/*`: specialized standards
   and operational procedures.
7. Source code, shared contracts, migrations, tests, and generated OpenAPI: implemented evidence.

Archived documents under `docs/archive` are historical context only. They cannot define current
scope or completion.

## Change Classification

Every change must be classified before implementation:

- `AUD-*`: read-only or documentation-led audit work that records evidence, severity, dependencies,
  and a resume point.
- `VS-*`: one complete customer, administrator, delivery-staff, or operator outcome across every
  required layer.
- Surgical fix: restores intended behavior without widening product scope; still requires focused
  regression coverage and the applicable slice evidence.
- Refactor: changes structure without changing product behavior; must preserve contracts and prove
  behavior with existing or improved tests.
- Hotfix: urgent production-risk correction with minimum safe scope, explicit incident reference,
  focused verification, rollback target, and a required follow-up audit when normal evidence cannot
  be completed before release.

Do not call a layer-only frontend, backend, migration, or deployment batch a completed vertical
slice.

## Required Slice Dossier

Before marking a slice complete, its backlog record must identify:

- outcome, roles, scope, non-goals, dependencies, and acceptance checks;
- route, shared contract, API handler, application use case, domain rule, repository/migration,
  asynchronous work, UI states, and authorization path;
- server-owned values, idempotency/replay behavior, transaction boundary, and audit event;
- loading, empty, error, forbidden, disabled, success, offline/retry, responsive, keyboard, and
  accessibility states where applicable;
- focused tests, repository checks, browser/build evidence, request/latency impact, and regression
  evidence;
- correlation/operation IDs, logs, metrics, alerts, runbooks, release environment, migration result,
  rollout, rollback target, and resume point;
- separate local, staging, and production evidence. Absence of required deployed evidence means
  `unverified`, not complete.

## Cross-Cutting Policies

- Contracts: prefer additive changes. Breaking API/event changes require explicit versioning,
  consumer migration, generated OpenAPI updates, deprecation/removal criteria, and rollback notes.
- Configuration: non-secret operational settings belong in validated environment configuration;
  secrets belong in Workers Secrets. Staging and production fail closed on missing critical values.
- Dependencies: justify new runtime packages, prefer existing workspace capabilities, update the
  lockfile intentionally, review license/security/maintenance impact, and avoid overlapping
  libraries for the same responsibility.
- Generated files: do not hand-edit generated artifacts. Regenerate them with the owning tool and
  include them only when the repository tracks them. Exclude build, report, trace, and temporary
  outputs. Follow the nested Next.js instructions for framework-maintained files.
- Feature flags: flags are temporary rollout controls, not permanent branches of business logic.
  Define owner, default, environment behavior, observability, rollback use, and removal condition.
- Time and money: persist UTC timestamps, assign weekly cycles in `Asia/Manila`, and store money as
  integer PHP centavos. Locale-specific formatting belongs at presentation boundaries.
- Accessibility and compatibility: target semantic HTML, keyboard operation, visible focus,
  meaningful labels/status announcements, reduced motion, stable responsive layouts, and supported
  browser/PWA behavior. Accessibility failures are functional failures.
- Data lifecycle: classify personal, financial, operational, and public data; minimize collection
  and logs; define retention, export, correction, deletion eligibility, backup, restore, and media
  authorization for affected data.
- Documentation: update the authoritative source closest to the decision. Architecture changes
  require an explicit decision and tradeoff record in the accepted architecture document or a
  focused architecture note linked from it.

## Coverage Rating

The rating measures whether the repository tells an engineer what to do and where to record
evidence. It does not mean the product itself is launch-ready. Each dimension is scored from 0 to 5.

| Guidance dimension                         |      Score | Primary evidence                                                                  |
| ------------------------------------------ | ---------: | --------------------------------------------------------------------------------- |
| Product scope, actors, and domain rules    |          5 | Production plan; domain-knowledge reference                                       |
| Architecture, boundaries, and data flow    |          5 | Production plan; system-design artifact/reference                                 |
| Repository navigation and ownership        |          5 | AGENTS; repo-navigation reference                                                 |
| Unified vertical-slice lifecycle           |          5 | Implementation backlog; skill workflow                                            |
| Contracts, APIs, compatibility, and errors |          5 | Contracts package; backend and cross-cutting guidance                             |
| Backend commands, auth, jobs, and retries  |          5 | Backend reference; queue/workflow runbooks                                        |
| Database schema, migrations, and queries   |          5 | Database reference; D1 migrations and tests                                       |
| Frontend architecture and design system    |          5 | Frontend standards; nested web AGENTS                                             |
| Testing, debugging, and regression control |          5 | Testing reference; package scripts; Playwright                                    |
| Security, abuse prevention, and secrets    |          5 | Security reference; security/secret runbooks                                      |
| Privacy, data lifecycle, and recovery      |          5 | Production plan; privacy workflows; backup/restore guidance                       |
| Performance, capacity, and caching         |          4 | Performance reference; load runbook; numeric slice budgets still need ownership   |
| Observability, incidents, and alerts       |          5 | Observability package/reference; incident and alert runbooks                      |
| Environments, deployment, and rollback     |          5 | Wrangler configs; deployment reference; release runbooks                          |
| Configuration, flags, and integrations     |          5 | Config package; cross-cutting guidance; provider boundaries                       |
| Dependencies and generated artifacts       |          5 | Contributing rules; cross-cutting guidance; automated guidance check              |
| Accessibility, responsive behavior, locale |          4 | Frontend standards and tests; formal supported-browser matrix remains operational |
| Documentation and architecture decisions   |          5 | This hierarchy; backlog handoff; architecture documents                           |
| Git, review, atomic delivery, and hotfixes |          5 | AGENTS; CONTRIBUTING; pull-request template                                       |
| Evidence enforcement and drift prevention  |          4 | `pnpm guidance:check`; staging automation remains a planned improvement           |
| **Total**                                  | **96/100** | **9.6/10 guidance coverage**                                                      |

## Remaining Guidance Improvements

These do not prevent the repository from meeting the 9.5/10 guidance target, but they are the next
quality improvements:

1. Approve numeric performance budgets and owning roles per critical journey.
2. Publish the supported browser/device/PWA matrix.
3. Automate staging cross-role smoke evidence and attach it to release records.
4. Complete named launch ownership and production resource evidence in Slice 022.

Re-score this matrix when a new runtime, client, country/currency, fulfillment model, or major
provider is introduced.
