# Observability

Every request, job, webhook, and workflow step carries a correlation ID; background work also has
a durable job/event ID. Use structured logs with safe fields: route, operation, role scope, status,
duration, retry count, provider, and outcome. Never log secrets or sensitive payloads.

Emit metrics for request latency/error rate, D1 query and transaction duration, cache hits, queue
lag/retries/dead letters, workflow completion, payment/provider outcomes, delivery exceptions, and
critical business cutoffs. Keep health endpoints lightweight and independent of business data.

Every failure path should be diagnosable from correlation ID to persisted event/outbox record and
retry state. Define alert thresholds and runbooks for queue dead letters, failed payments,
stalled weekly operations, failed deliveries, and elevated API latency.
