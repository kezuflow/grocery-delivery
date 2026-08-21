# Operational alert ownership

| Alert                      | Primary owner      | First response                                                           |
| -------------------------- | ------------------ | ------------------------------------------------------------------------ |
| Failed payment / past due  | Finance on-call    | Check provider status, retry state, and customer notification            |
| Dead-lettered outbox event | Platform on-call   | Inspect payload and replay only after idempotency review                 |
| Cutoff or workflow failure | Operations on-call | Confirm cycle, pause affected writes, and use the Friday-cycle runbook   |
| Delivery exception         | Dispatch on-call   | Contact delivery staff, preserve failure reason, and update the customer |
| Abusive request pattern    | Security on-call   | Rate-limit/revoke sessions, preserve evidence, and open an incident      |

Every alert record must include observed value, threshold, owner, correlation ID, first response,
and resolution timestamp. Alerts are reviewed at the daily operations handoff and at each launch
go/no-go meeting.
