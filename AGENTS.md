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

- Read `docs/project-guidance.md` when planning or reviewing repository-wide work. It defines the
  source-of-truth hierarchy, local-first change classifications, and verification expectations.
- Local development is the default phase. Implement and iterate against local Workers, local D1,
  deterministic fixtures, and local browser sessions.
- Do not deploy, publish remote fixture data, run staging rehearsals, provision remote resources,
  commit, or push unless the user explicitly requests that action in the current conversation.
- Staging and production are later promotion phases. Their existing scripts, configuration, and
  historical records remain available, but they are not prerequisites for completing local work.
- Work on the current branch and preserve the user's working tree. Do not create or switch branches
  unless explicitly requested.
- Preserve unrelated user changes. Do not reset, checkout, or discard work without an
  explicit request.
- Use conventional commits with a kebab-case scope, for example:
  `feat(carts): add persistent customer carts`.
- Enforce commit-message and branch-name conventions through the local hooks in `.githooks`.
  Do not add GitHub Actions for naming-convention validation.
- Prefer existing package boundaries, interfaces, and patterns before adding abstractions.
- Justify new runtime dependencies and review maintenance, security, license, bundle/runtime cost,
  and overlap with existing workspace capabilities. Update `pnpm-lock.yaml` intentionally.
- Do not hand-edit generated artifacts. Regenerate tracked outputs with their owning command and
  exclude build reports, traces, caches, and temporary files from commits.
- Use ASCII by default and `apply_patch` for manual edits.
- Keep admin-configurable values configurable. Do not encode current plan prices or other
  operational settings as domain invariants unless the requirement explicitly calls for it.
- Update `docs/implementation-backlog.md` when active scope, local completion evidence, or the resume
  point changes. A local slice may be complete without a commit, push, deployment, or staging proof.

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
Windows workspace links. For a completed local slice, run the narrowest relevant checks, then:

```text
pnpm check
```

`pnpm check` covers formatting, lint, typecheck, and tests across all Turbo packages. Add or
update focused tests with every behavior change, including invalid input, authorization,
idempotency, persistence, and server-side price resolution where applicable.

Each completed local slice must record the end-to-end trace, local fixture/browser evidence, and
relevant request, latency, persistence, and observability impact. Missing staging or production
evidence does not block local completion; record it only when the user starts a promotion phase.

## Delivery

The default handoff is an uncommitted, locally verified working tree. When the user explicitly asks
for a commit, inspect `git status`, `git diff --check`, and the staged diff before committing. When
the user explicitly asks for a push or deployment, perform that separately and report the exact
target and evidence.
