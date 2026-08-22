# Repository Instructions

## Project Shape

- This is a pnpm monorepo managed by Turbo.
- `apps/api` is the Hono Cloudflare API Worker.
- `apps/web` is the customer/admin web application.
- `packages/domain` owns framework-independent business rules and value objects.
- `packages/application` owns use cases and service boundaries.
- `packages/contracts` owns Zod request/response contracts.
- `packages/db` owns D1 repositories and forward-only SQL migrations.
- `packages/billing`, `packages/notifications`, `packages/storage`, `apps/jobs`, and
  `apps/workflows` provide isolated infrastructure boundaries.

Keep dependencies flowing from workers to application to domain. Domain code must not
import Hono, Cloudflare bindings, D1 APIs, frontend frameworks, or payment SDKs.

## Working Rules

- Use the repository skill at `.codex/skills/carbon-vertical-slice/SKILL.md` for feature work,
  audits, refactors, performance work, and release decisions. Load only the concern references
  relevant to the task. The skill supplements these instructions; it does not replace the
  canonical backlog or architecture documents.
- Work directly on `main`; completed work is committed and pushed to `origin/main`.
- Preserve unrelated user changes. Do not reset, checkout, or discard work without an
  explicit request.
- Use conventional commits with a kebab-case scope, for example:
  `feat(carts): add persistent customer carts`.
- Enforce commit-message and branch-name conventions through the local hooks in `.githooks`.
  Do not add GitHub Actions for naming-convention validation.
- Prefer existing package boundaries, interfaces, and patterns before adding abstractions.
- Use ASCII by default and `apply_patch` for manual edits.
- Keep admin-configurable values configurable. Do not encode current plan prices or other
  operational settings as domain invariants unless the requirement explicitly calls for it.
- Before committing a completed slice, update `docs/implementation-backlog.md` with the slice's
  completion record and resume point. Stage that handoff update together with the implementation
  so each slice lands as one clean conventional commit; do not create a separate documentation
  commit afterward.

## Data And API Rules

- Store money as integer PHP centavos through the domain `Money` value object.
- Never trust client prices, totals, fees, credits, roles, statuses, or availability.
  Resolve commerce values from server-side catalog, plan, subscription, and configuration
  sources.
- Use idempotency keys for order, subscription, payment, refund, and other retriable writes.
- D1 changes use new forward-only migrations under `packages/db/migrations`.
- Access D1 only through repository interfaces; do not put SQL in domain or application
  rules.
- Protected API routes must resolve an active customer/admin session and return the existing
  correlation-aware error envelope.
- Keep `/health` and `/api/v1/health` lightweight and independent of business data.

## Verification

Run pnpm commands serially because concurrent installs or package operations can corrupt
Windows workspace links. Before committing a slice, run the narrowest relevant checks, then:

```text
pnpm check
```

`pnpm check` covers formatting, lint, typecheck, and tests across all Turbo packages. Add or
update focused tests with every behavior change, including invalid input, authorization,
idempotency, persistence, and server-side price resolution where applicable.

Each completed vertical slice must also record the end-to-end trace, local versus staging
evidence, request/latency impact, observability signals, rollout, and rollback target. A passing
check without required staging or workflow evidence is `unverified`, not complete.

## Delivery

Before pushing, inspect `git status`, `git diff --check`, and the staged diff. Push only the
intentional slice to `origin main`:

```text
git -c safe.directory=E:/GithubProjects/carbon-food-delivery push origin main
```
