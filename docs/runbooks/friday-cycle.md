# Friday cycle rehearsal

Use `APP_ENV=test`, the in-memory repositories, and fixed timestamps. Seed one active subscription,
one serviceable address, one delivery window, and one saved cart. Verify that the order cutoff is
enforced, the order lock is idempotent, the outbox event is emitted once, and dispatch rejects an
unpacked order. The same fixture must be safe to run repeatedly.

The credential-free preflight is `pnpm rehearsal:check friday`.
