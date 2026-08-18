## Summary

<!-- What behavior changed? Keep this focused on one feature or change set. -->

## Atomic Commit Checklist

- [ ] Each commit has the required `<type>(<scope>): <summary>` format.
- [ ] Each commit contains one independently reviewable feature, fix, refactor, test, or documentation change.
- [ ] Multiple features in the working batch were split into separate commits.
- [ ] Unrelated formatting, generated files, and drive-by refactors were excluded.
- [ ] Database migrations, rollout notes, rollback notes, and observability changes are included when relevant.

## Verification

- [ ] Focused tests and type checks were run for the changed packages.
- [ ] Broader checks were run when shared contracts, migrations, or workflows changed.
