# Release hardening preflight

The web Worker uses the `API` service binding in each Wrangler environment. The API Worker owns
`API_PUBLIC_ORIGIN` and `CORS_ORIGINS`; staging and production must set both to real HTTPS origins
before deployment. Local development uses the checked-in localhost values.

Run `pnpm rehearsal:check` before a release. It validates migration numbering, runbook presence,
the API provider sandbox command, and the bounded load and incident procedures without requiring
Cloudflare credentials. Execute the environment-specific migration and backup steps only from an
authorized staging release shell.
