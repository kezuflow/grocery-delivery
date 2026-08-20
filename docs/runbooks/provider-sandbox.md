# Payment-provider sandbox rehearsal

Use the provider's sandbox tokens and `PAYMENT_PROVIDER=fake` only in development or test. Verify
tokenization, authorization, duplicate idempotency replay, failed payment handling, webhook replay,
and reconciliation. Assert that raw payment credentials never appear in logs or D1 fixtures.

The credential-free preflight is `pnpm rehearsal:check sandbox`.
