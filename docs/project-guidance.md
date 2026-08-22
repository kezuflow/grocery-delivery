# Project Guidance

Status: accepted local-development guidance

This document keeps repository work focused on building and validating Carbon locally. Staging and
production are promotion phases that begin only when the user explicitly requests them.

## Source Of Truth

Use the narrowest applicable source. When sources conflict, update the conflict in the same change.

1. `AGENTS.md` and the nearest nested `AGENTS.md`: mandatory working rules.
2. `docs/implementation-backlog.md`: active scope, status, local evidence, and resume point.
3. `docs/frontend-backend-audit.md`: route, contract, and behavior gaps found during local testing.
4. `docs/architecture/production-plan.md`: accepted product and runtime architecture.
5. `docs/frontend-standards.md`: frontend structure, interaction, and local browser verification.
6. Source code, shared contracts, migrations, tests, and generated OpenAPI: implemented behavior.

Runbooks under `docs/runbooks` and historical records under `docs/archive` are dormant references.
They do not define current scope or block local completion. Use a runbook only after the user starts
the corresponding staging, release, incident, or operations task.

## Local First

- Build one customer, administrator, delivery-staff, or operator outcome at a time.
- Trace the route, typed contract, API handler, application use case, domain rule, repository or
  migration, asynchronous work, UI states, and focused tests that are relevant to the outcome.
- Use local Workers, local D1, deterministic fixtures, and local browser sessions for iteration.
- Keep prices, totals, fees, credits, roles, statuses, permissions, and availability server-owned.
- Include loading, empty, error, forbidden, disabled, retry, success, responsive, keyboard, and
  accessibility states where applicable.
- Run focused checks first, then `pnpm check`. Add Playwright, accessibility, visual, persistence,
  idempotency, and authorization coverage in proportion to the behavior changed.
- A slice can be locally complete when its local acceptance checks pass. It does not need staging,
  deployment, rollout, rollback, a commit, or a push.

## Remote Actions

Do not deploy Workers, publish remote fixture data, run staging rehearsals, apply remote migrations,
provision remote resources, rotate remote secrets, commit, or push unless the user explicitly asks
for that action in the current conversation.

When the user starts a staging or production phase, create a separate promotion checklist from the
already completed local slice. Keep local, staging, and production evidence distinct, and never
present local fixtures as deployed evidence.

## Cross Cutting Rules

- Prefer additive contracts. Breaking API or event changes need explicit versioning and consumer
  migration planning before promotion.
- Store non-secret operational values in validated configuration and secrets outside Git.
- Justify new runtime dependencies and review maintenance, security, license, bundle/runtime cost,
  and overlap with existing workspace capabilities.
- Do not hand-edit generated artifacts. Regenerate tracked outputs with their owning command.
- Persist UTC timestamps, assign weekly cycles in `Asia/Manila`, and store PHP money as integer
  centavos through the domain `Money` value object.
- Treat accessibility, authorization, validation, privacy, and idempotency as functional behavior,
  including during local development.
- Preserve unrelated working-tree changes and avoid drive-by refactors.

## Local Completion Record

For an active slice, record only the evidence that helps the next local iteration:

- outcome, affected roles, scope, non-goals, and acceptance checks;
- route-to-persistence trace and server-owned values;
- authorization, validation, idempotency, and failure behavior;
- focused tests, `pnpm check`, and relevant local browser evidence;
- request, query, cache, bundle, latency, or queue impact when materially changed;
- remaining local gaps and the next resume point.

Staging, release, rollout, rollback, ownership, and production evidence are intentionally deferred
until the user requests promotion.
