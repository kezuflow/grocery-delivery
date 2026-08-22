# Testing And Debugging

Reproduce the user journey with deterministic local fixtures first. Inspect the route, API request,
correlation ID, server logs, repository query, and rendered state before changing code. Preserve a
minimal reproduction in a focused test.

Use the narrowest useful layer: domain tests for invariants, contract tests for schemas, repository
tests for persistence/query behavior, application tests for use-case orchestration, API tests for
auth/error envelopes, web tests for client and feature behavior, and Playwright for cross-role,
responsive, accessibility, offline, and visual behavior. Add invalid, forbidden, duplicate,
failure, and retry cases for writes.

Run serially on Windows: the changed package checks, then `pnpm check`. For web workflow changes,
also run the production build and relevant `pnpm --filter @carbon/web test:e2e` projects. Do not
silence a failing snapshot; determine whether the UI change is intentional, then update only the
affected baseline with the behavior documented.
