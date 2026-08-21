# Abuse monitoring and response

The on-call owner reviews rate-limit metrics, authentication failures, rejected origins, repeated
idempotency conflicts, and unusual delivery-media upload failures every business day and during a
launch rehearsal.

Escalation thresholds:

- More than 20 authentication `429` responses from one client key in 15 minutes: temporarily block
  the key and inspect account activity.
- More than 10 origin or authorization failures for one account in 10 minutes: revoke sessions and
  open a security incident.
- Repeated media signature failures or uploads over the limit: preserve correlation IDs and inspect
  the account and IP pattern without logging media contents.

The incident owner records the time window, route, correlation IDs, action taken, and recovery
verification. Do not log passwords, payment credentials, signed URLs, or proof-media bytes.
