# Secret rotation

Rotate staging first, then production, using Wrangler secrets. Never print secret values or place
them in `.env` files, tickets, shell history, or the repository.

1. Generate a new value with `scripts/set-worker-secrets-staging.cmd` and verify API health,
   Better Auth sign-in, event-processor delivery, and signed media upload/download.
2. Record the rotation time, operator, Worker versions, and verification correlation IDs.
3. Repeat with `scripts/set-worker-secrets-production.cmd` during the approved maintenance window.
4. Revoke the previous provider, event-processor, media-signing, and Better Auth credentials after
   the new values are confirmed in logs and dashboards.
5. If verification fails, stop writes where appropriate, restore the prior secret, and attach the
   failure evidence to the incident record.

Required secret families are `BETTER_AUTH_SECRET`, `EVENT_PROCESSOR_TOKEN`,
`MEDIA_SIGNING_SECRET`, and the PayMongo secret configured through Wrangler.
