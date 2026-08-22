## Summary

<!-- What behavior changed? Keep this focused on one feature or change set. -->

## Vertical-Slice Evidence

<!-- For non-feature changes, state why each item is not applicable. -->

- Outcome and affected roles:
- End-to-end trace (route -> contract -> API -> application -> domain -> repository/async -> UI):
- Authorization, server-owned values, and idempotency/replay behavior:
- Local fixture and browser evidence:
- Request count, latency, bundle, query, cache, or queue impact:
- Logs, metrics, and remaining local gaps:

## Atomic Commit Checklist

- [ ] Each commit has the required `<type>(<scope>): <summary>` format.
- [ ] Each commit contains one independently reviewable feature, fix, refactor, test, or documentation change.
- [ ] Multiple features in the working batch were split into separate commits.
- [ ] Unrelated formatting, generated files, and drive-by refactors were excluded.
- [ ] Local database migrations and observability changes are included when relevant.
- [ ] Contract/OpenAPI compatibility, dependency changes, generated files, and configuration changes were reviewed.
- [ ] Security, privacy/data lifecycle, accessibility, performance, and failure modes were reviewed where applicable.

## Verification

- [ ] Focused tests and type checks were run for the changed packages.
- [ ] Broader checks were run when shared contracts, migrations, or workflows changed.
- [ ] `pnpm check` passed.
- [ ] Required local browser, accessibility, visual, provider-adapter, and migration checks passed or are explicitly marked `unverified`.
