---
name: carbon-vertical-slice
description: Repository-specific guidance for designing, implementing, reviewing, testing, and releasing one complete Carbon Food Delivery vertical slice across contracts, Workers, D1, UI, authorization, operations, and evidence. Use for feature work, audits, refactors, performance work, and release decisions in this repository.
---

# Carbon Vertical Slice

Use this skill as the repository's implementation playbook. It supplements `AGENTS.md`,
`docs/implementation-backlog.md`, `docs/frontend-backend-audit.md`,
`docs/project-guidance.md`, `docs/architecture/production-plan.md`, and
`docs/frontend-standards.md`; those files remain the authoritative project records. Do not create
a second backlog, architecture truth, or frontend plan.

## Operating Contract

Every change is either:

- an `AUD-*` audit finding with evidence and a resume point; or
- a `VS-*` vertical slice that delivers one user-visible or operator-visible outcome.

For a vertical slice, trace and verify the complete path:

`user journey -> route -> typed contract -> API handler -> application use case -> domain rule -> repository/migration -> async work -> UI state -> tests -> local/staging evidence`

If a required server capability is missing, record a contract gap and keep the slice incomplete.
Do not fill it with mock business rules or client-owned values.

## Start Here

1. Read the repository `AGENTS.md`, the applicable nested `AGENTS.md`, and the relevant standards
   docs before editing.
2. Locate the current route, API endpoint, shared contract, application service, repository, and
   migration with `rg`. Preserve existing boundaries before adding abstractions.
3. Write the slice outcome, affected roles, acceptance checks, failure states, data ownership,
   idempotency key, observability evidence, rollout, rollback, and resume point.
4. Decide whether the change is a read, command, asynchronous job, workflow, projection, or a
   combination. Keep provider calls and long work outside D1 transactions and request latency.
5. Implement the smallest complete outcome, adding focused tests with the behavior change.
6. Verify narrow checks first, then `pnpm check`, relevant Playwright/accessibility/visual checks,
   production build, and deterministic local fixtures. Staging claims require staging evidence.
7. Update the canonical backlog in the same implementation commit. Inspect the staged diff,
   commit conventionally, and push only the intentional slice.

## Concern Routing

Read only the references needed for the current work:

- Architecture, boundaries, flows, queues, caching, and failure modes: [system-design.md](references/system-design.md)
- Finding files and tracing a feature: [repo-navigation.md](references/repo-navigation.md)
- API, auth, jobs, retries, idempotency, validation, and errors: [backend-engineering.md](references/backend-engineering.md)
- D1 schema, migrations, indexes, transactions, and queries: [database-engineering.md](references/database-engineering.md)
- React/Next structure, data fetching, UI states, responsive/accessibility rules: [frontend-engineering.md](references/frontend-engineering.md)
- Reproduction, test layers, commands, and regression diagnosis: [testing-debugging.md](references/testing-debugging.md)
- Authz, secrets, validation, tenant boundaries, and web threats: [security.md](references/security.md)
- Latency, caching, N+1s, bundles, memory, and concurrency: [performance.md](references/performance.md)
- Wrangler environments, deployment, migrations, rollback, and release evidence: [devops-deployment.md](references/devops-deployment.md)
- Correlation IDs, structured logs, metrics, traces, job IDs, and alerts: [observability.md](references/observability.md)
- Surgical fixes, refactoring triggers, and dependency rules: [refactoring.md](references/refactoring.md)
- Product entities, roles, money, cycles, and invariants: [domain-knowledge.md](references/domain-knowledge.md)
- Source hierarchy, compatibility, configuration, dependencies, generated files, data lifecycle,
  documentation, and hotfixes: [cross-cutting-governance.md](references/cross-cutting-governance.md)

## Stop Conditions

Stop and report a blocker when the requested result requires an unavailable backend contract,
missing authorization decision, destructive migration without a forward path, production access
not granted by the user, or a staging claim that has not been observed. Continue with read-only
audit work and document the exact missing evidence.

## Definition Of Done

A slice is not complete merely because it compiles or renders. It needs a server-owned contract,
authorization, persistence and retry behavior where applicable, loading/empty/error/forbidden/
disabled/success states, focused tests, repository checks, responsive/accessibility evidence,
observability, deployment/rollback notes, and a canonical backlog completion record. Mark it
`partial`, `missing`, or `unverified` when any required evidence is absent.
