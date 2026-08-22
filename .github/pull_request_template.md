## Summary

<!-- What behavior changed? Keep this focused on one feature or change set. -->

## Vertical-Slice Evidence

<!-- For non-feature changes, state why each item is not applicable. -->

- Outcome and affected roles:
- End-to-end trace (route -> contract -> API -> application -> domain -> repository/async -> UI):
- Authorization, server-owned values, and idempotency/replay behavior:
- Local, staging, and production evidence:
- Request count, latency, bundle, query, cache, or queue impact:
- Logs, metrics, alerts, rollout, and rollback target:

## Atomic Commit Checklist

- [ ] Each commit has the required `<type>(<scope>): <summary>` format.
- [ ] Each commit contains one independently reviewable feature, fix, refactor, test, or documentation change.
- [ ] Multiple features in the working batch were split into separate commits.
- [ ] Unrelated formatting, generated files, and drive-by refactors were excluded.
- [ ] Database migrations, rollout notes, rollback notes, and observability changes are included when relevant.
- [ ] Contract/OpenAPI compatibility, dependency changes, generated files, and configuration changes were reviewed.
- [ ] Security, privacy/data lifecycle, accessibility, performance, and failure modes were reviewed where applicable.

## Verification

- [ ] Focused tests and type checks were run for the changed packages.
- [ ] Broader checks were run when shared contracts, migrations, or workflows changed.
- [ ] `pnpm check` passed.
- [ ] Required browser, accessibility, visual, provider, migration, rehearsal, and staging checks passed or are explicitly marked `unverified`.
