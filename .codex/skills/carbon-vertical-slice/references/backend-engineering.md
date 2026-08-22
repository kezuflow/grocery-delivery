# Backend Engineering

Use shared contracts at the HTTP boundary and validate both input and output. Protected routes
must resolve the active session and server-owned role/permission scope. Never accept client prices,
totals, fees, credits, availability, statuses, ownership, or roles as authoritative.

Commands must define their idempotency key, replay result, conflict behavior, authorization,
transaction boundary, audit event, and retry semantics. Keep D1 transactions short; never hold one
open across payment, email, storage, or other network calls. Put retryable work on Queues and
multi-step schedules in Workflows. Make handlers return the existing correlation-aware error
envelope and avoid leaking provider or database details.

For every write, test valid input, invalid input, unauthorized/forbidden access, duplicate or
replay behavior, persistence, server-owned value resolution, and provider/queue failure where
applicable. Treat webhooks as untrusted, signed, deduplicated events.
