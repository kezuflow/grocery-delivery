# Current Handoff: Slice 002, API Runtime Composition

Status: ready to commit

## Goal

Create one maintainable API runtime composition boundary for environment bindings, persistent
sessions, and payment-provider selection. Production integrations should be configured in the
Worker entrypoint instead of being scattered through route handlers.

## Planned Work

1. Inspect the current API option and binding boundaries.
2. Add typed runtime configuration validation and composition helpers.
3. Make missing production auth/payment configuration fail clearly while preserving test injection.
4. Add focused tests and documentation.
5. Run `pnpm check`, commit, and push the slice.
6. Remove this handoff in a cleanup commit and push before starting the next slice.

## Progress

- Added typed `AUTH_MODE` and `PAYMENT_PROVIDER` parsing in `@carbon/config`.
- Added an API Worker runtime factory that composes configured integrations in one module.
- Added correlation-aware configuration failure responses.
- Made the fake payment provider explicit and development-only.
- `pnpm check` passes all 53 Turbo tasks.
- Wrangler dry-runs pass for development, staging, and production with the existing D1 bindings.
- Staging and production still report the pre-existing warning that `VERSION` is not repeated in
  their environment-specific vars; that unrelated configuration cleanup is not part of this slice.

## Resume Notes

Slice 001 is complete on `origin/main` as `03ef3bc`; its handoff cleanup is `ef83c8b`. The three D1
databases already exist and must not be recreated. Pre-existing deletions under `docs/ui-mockups`
are user changes and must remain untouched. The next action is to stage only the Slice 002 files,
commit them as `feat(api): compose runtime integrations`, push `origin/main`, then delete this file
in a separate cleanup commit and push again.
