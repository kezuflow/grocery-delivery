# Bounded load rehearsal

Run the deterministic capacity model first: create 20,000 in-memory weekly-cart fixtures, calculate
their bounded lock payloads, and verify that every fixture has one idempotency key and no duplicate
customer ownership. Then run the HTTP smoke pass only against local or disposable staging endpoints,
with no more than 20 virtual clients and 200 total requests, targeting health, catalog reads, and one
authenticated mutation fixture. Confirm rate-limit headers, correlation IDs, p95 latency, and zero
duplicate idempotent writes. Stop the run if error rate exceeds 5%; clean up all fixture records
afterward.

The credential-free preflight is `pnpm rehearsal:check load`.
