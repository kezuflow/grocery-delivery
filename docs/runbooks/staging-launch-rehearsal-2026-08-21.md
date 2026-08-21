# Staging launch rehearsal: 2026-08-21

## Decision

**No-go. Slice 022 remains blocked.** The deployed staging infrastructure is healthy and the
credential-free rehearsals pass, but staging has no catalog, delivery windows, test identities, or
orders. The required signup-to-delivery and PayMongo sandbox flows therefore cannot be exercised.
Production Workers and production queue/R2 resources have also not been provisioned, and human
go/no-go owners have not been named.

## Deployed staging evidence

| Component       | Verified version or state                                                      |
| --------------- | ------------------------------------------------------------------------------ |
| API Worker      | `d31908ee-b6d0-441f-b6c6-3806598fa8de`                                         |
| Web Worker      | `cb188806-7f27-4f00-b00a-47dd79b4552f`                                         |
| Jobs Worker     | `e547906a-a346-4b51-9b07-cf1e9f405116`                                         |
| Workflow Worker | `0c647a09-383a-4b3b-b6b8-9289749594bd`                                         |
| D1 migrations   | 36 applied; no pending migrations                                              |
| Queue           | `carbon-food-delivery-outbox-staging`, one producer and one consumer           |
| R2              | media and OpenNext cache buckets present                                       |
| API secrets     | Better Auth, event processor, media signing, and PayMongo secret names present |
| Jobs secrets    | event processor secret name present                                            |

Both health routes returned `200` with `Cache-Control: no-store`. Trusted staging-origin mutations
reached authentication and returned `401`; an untrusted origin was rejected with the standard `403`
`ORIGIN_NOT_ALLOWED` envelope. The web home and protected redirect responses returned HSTS,
`nosniff`, `DENY` framing, and strict-origin referrer headers. Static Next.js assets retained their
one-year immutable cache policy.

## Rehearsal results

- `pnpm rehearsal:check` passed all deterministic checks. The load model created exactly 20,000
  unique customer/cart idempotency fixtures.
- The read-only staging HTTP smoke pass sent exactly 200 health/catalog requests: 200 succeeded,
  error rate was 0%, p95 was 1307.9 ms, and every response included a correlation ID.
- The authenticated mutation portion was not run because staging has no customer identity or launch
  catalog/window fixture.
- The staging D1 export completed in 4.66 seconds. The 33,645-byte export had SHA-256
  `8DF09944C4E3A0169D3F3B23969EBD25ECA6CEF6568DD506D129D1C15EB7DA8E`.
- Import into disposable D1 database `carbon-food-delivery-restore-rehearsal-20260821` completed in
  7.11 seconds and verified all 36 migration records. The database was deleted in 3.89 seconds.
- The web Worker rollback to `b857b572-99b8-4f30-afca-02728346bbdb` completed in 3.68 seconds. The
  tested version was restored at 100% in 4.29 seconds and the staging domain returned the expected
  security headers after propagation.
- Existing queue retry/dead-letter/replay and durable workflow timings remain recorded in
  `docs/runbooks/queue-retry-dead-letter.md`.

## Launch configuration review

The checked-in staging and production API environments select PayMongo, a 990-centavo delivery fee,
postal codes `1000,1100,1200`, 30-day delivery-media retention, and non-zero operational alert
thresholds. Staging exposes three active, non-zero plans. The staging database currently contains:

| Launch data           | Count |
| --------------------- | ----: |
| Catalog categories    |     0 |
| Active catalog SKUs   |     0 |
| Delivery windows      |     0 |
| Better Auth users     |     0 |
| Legacy identity users |     0 |
| Orders                |     0 |

No production API, web, jobs, or workflow Worker exists in the Cloudflare account. Production secret
inventory therefore cannot exist yet, and the production media bucket and outbox queue are absent.
The production D1 database exists but is empty. These are expected pre-launch resources, but they
must be provisioned and verified before a launch-ready decision.

## Blocking requirements

1. Load approved staging catalog categories/SKUs and at least one future delivery window with usable
   capacity, without inventing operational values.
2. Provision verified staging identities for a customer, an MFA-capable administrator, and delivery
   staff, then run the full signup, subscription, cart, PayMongo sandbox payment, order lock,
   procurement, packing, dispatch, proof, and customer-tracking flow.
3. Complete the authenticated 200-request smoke fixture and verify rate-limit headers plus duplicate
   idempotency behavior.
4. Name the human finance, platform, operations, dispatch, security, incident-command, and rollback
   owners for the go/no-go record.
5. Provision production Workers, secrets, queue, R2 buckets, migrations, catalog, windows, zones,
   alerts, and custom domains; then repeat configuration and rollback verification without using
   fake providers or zero-value operational defaults.

After these requirements pass, update this record with transaction/order IDs, timings, owner names,
and a final go/no-go decision before marking Slice 022 complete.
