# Database Engineering

D1 is the transactional source of truth. Add forward-only migrations under
`packages/db/migrations`; never rewrite an applied migration or put SQL in domain/application
rules. Access D1 only through repository interfaces.

Model ownership and lifecycle explicitly. Commerce records should carry customer and cycle scope
where applicable. Store money as integer PHP centavos through the domain `Money` value object.
Use unique constraints for idempotency keys, cycle/order identity, webhook identity, and other
replay-sensitive records. Add indexes from measured access patterns, especially scope + status +
time queries and cursor pagination fields.

Keep transactions bounded and deterministic. Resolve server-owned prices and snapshots before an
order becomes immutable. Use append-only ledgers/events for financial or operational history and
projections for read-heavy dashboards. Add repository tests, migration tests, transaction conflict
tests, and integration coverage for the affected path.
