# Contributing

## Git Workflow

- `main` is the delivery branch for completed slices.
- Naming conventions are enforced locally through the repository Git hooks.
- Do not add GitHub Actions that duplicate commit-message or branch-name validation.
- Keep commits small, focused, and reversible.
- Prefer one logical change per commit.

Install the local hooks once after cloning:

```powershell
.\scripts\install-git-hooks.ps1
```

Git Bash users may run:

```bash
./scripts/install-git-hooks.sh
```

## Commit Messages

Use Conventional Commits with a required scope:

```text
<type>(<scope>): <imperative summary>
```

Allowed types:

`feat`, `fix`, `docs`, `refactor`, `test`, `build`, `ci`, `chore`, `perf`, `revert`

Rules:

- Use lowercase for the type and scope.
- Always include a lowercase kebab-case scope, such as `billing`, `weekly-cycle`, or `admin-console`.
- Use an imperative summary with no trailing period.
- Keep the first line at 72 characters or fewer.
- Add `!` before the colon for a breaking change, for example `feat(api)!: remove legacy checkout`.
- Put implementation detail, migration notes, and issue references in the body.

Examples:

```text
feat(subscriptions): add weekly skip action
fix(billing): make payment webhook processing idempotent
docs(architecture): record D1 migration boundary
refactor(catalog)!: replace legacy sku identifiers
```

## Atomic Feature Commits

When a large batch contains multiple features, split it into multiple commits. Each commit must represent one independently reviewable feature, fix, refactor, test change, or documentation change and must use the matching type and scope.

Good history:

```text
feat(catalog): add sku import
feat(pricing): calculate markup overrides
feat(admin-console): show catalog import results
test(pricing): cover per-sku markup precedence
```

Avoid a single commit such as `feat(app): build catalog pricing and admin workflows`. Use `git add -p`, separate working branches, or `git reset` to split a large working batch before committing. Feature commits may depend on earlier commits, but each should be understandable and revertible on its own.

The local commit-message hook enforces the message format. Whether a commit contains one coherent feature is verified during review using the checklist below.

## Branch Names

Use:

```text
<type>/<short-kebab-case-description>
```

Examples:

```text
feat/subscription-checkout
fix/payment-webhook-replay
docs/cloudflare-architecture
chore/ci-conventions
```

Allowed branch types are the same as commit types, with `hotfix` and `release` also permitted. `main` and `develop` are reserved branch names.

## Source Naming

- TypeScript files and directories: lowercase kebab-case, except framework-required names such as `page.tsx`, `layout.tsx`, and `route.ts`.
- React components and classes: PascalCase.
- Functions, variables, hooks, and properties: camelCase.
- Types, interfaces, and enums: PascalCase.
- Constants: `UPPER_SNAKE_CASE` only for true immutable application constants.
- Environment variables: `UPPER_SNAKE_CASE`.
- Database tables and columns: plural snake_case tables and snake_case columns.
- API paths: lowercase kebab-case nouns under `/api/v1`.
- JSON fields: camelCase at the API boundary; map to database snake_case in the data layer.
- Test files use the source name plus `.test.ts` or `.spec.ts`.

## Pull Requests

- Explain the behavior change and operational impact.
- Include migration, rollout, rollback, and observability notes when relevant.
- Add tests at the narrowest useful layer.
- Do not include credentials, customer data, payment data, or generated build output.
