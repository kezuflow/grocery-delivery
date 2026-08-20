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

## Staging evidence: 2026-08-20 UTC

- API Worker version: `718d3238-a337-4245-81ff-4ee6ac885765` at
  `https://api-staging.getscenepass.com`.
- Jobs Worker version: `7826b9f5-f821-4fe4-a763-ffa845ad0cfe`, bound to the staging D1 database,
  outbox queue, and API service binding.
- Workflow Worker version: `517bdbcb-44b4-4a8c-a3b9-95d2580fede3`, with the Friday `10:05 UTC`
  trigger, equivalent to `18:05 Asia/Manila` after the weekly cutoff.
- Queue `carbon-food-delivery-outbox-staging` reported one producer and one consumer.
- Synthetic event `rehearsal-20260820T183346Z` was inserted once as `payment.reconcile` with an
  intentionally invalid range. The jobs cron claimed it and the API service binding returned the
  bounded error `payment reconciliation range is invalid` with correlation ID `outbox-dispatch`.
- Processor attempts occurred at `18:40:38`, `18:41:09`, `18:42:10`, `18:44:11`, and `18:48:12`
  UTC, demonstrating approximately 30, 60, 120, and 240 second queue retry delays. D1 dead-lettered
  the event at `18:48:13` after attempt 5 and cleared its claim state.
- The payload was corrected, then the repository replay fields were reset without changing the
  event ID. The next cron processed the same row successfully at `18:50:38` with HTTP `202`; D1
  recorded one published row, zero attempts, and no remaining error or dead-letter state.
- Workflow instance `rehearsal-workflow-steps-20260820` completed all five durable steps in order.
  Each step output retained cycle `cycle-2026-08-22` and correlation ID
  `rehearsal-workflow-steps-20260820`.
