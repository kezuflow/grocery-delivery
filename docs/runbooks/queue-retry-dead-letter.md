# Queue retry and dead-letter rehearsal

The staging jobs Worker must be deployed before this rehearsal can produce live evidence.
Confirm the deployment and queue exist with:

```text
pnpm --filter @carbon/jobs exec wrangler deployments list --name carbon-food-delivery-jobs
pnpm --filter @carbon/jobs exec wrangler queues list
```

Rehearsal procedure:

1. Insert one synthetic outbox event with a unique `rehearsal:<timestamp>` idempotency key.
2. Confirm the scheduled jobs Worker publishes it once and the queue consumer receives it.
3. Force the processor to fail once; record the retry delay, attempt count, and correlation ID.
4. Force failures through the configured retry limit; record the dead-letter timestamp and alert.
5. Replay the dead-lettered event through the repository replay boundary, then confirm successful
   processing does not create a second provider delivery for the same idempotency key.
6. Attach Worker logs, queue metrics, and the event ID to the staging rehearsal ticket.

The replay operation resets only the retry state. It preserves the original outbox event ID, so
provider adapters can continue to deduplicate retries by idempotency key.
