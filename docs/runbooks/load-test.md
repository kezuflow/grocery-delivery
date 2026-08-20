# Bounded load rehearsal

Run only against local or disposable staging endpoints. Use no more than 20 virtual clients and
200 total requests, targeting health, catalog reads, and one authenticated mutation fixture. Confirm
rate-limit headers, correlation IDs, p95 latency, and zero duplicate idempotent writes. Stop the run
if error rate exceeds 5%; clean up all fixture records afterward.

The credential-free preflight is `pnpm rehearsal:check load`.
