# Carbon Food Delivery

Carbon Food Delivery is a pnpm + Turborepo monorepo for the Carbon grocery
platform.

## Repository shape

```text
apps/
  web/          Next.js App Router application, deployed with OpenNext to Cloudflare Workers
  api/          Hono API Worker (scaffold)
  jobs/         Queue consumers (scaffold)
  workflows/    Cloudflare Workflows (scaffold)

packages/
  domain/ application/ contracts/ db/ auth/ billing/ notifications/
  observability/ storage/ ui/ config/
```

The web Worker is the presentation layer. The API Worker is the future
service-binding boundary for authentication, catalog, checkout, and other
business operations; the web app should not access D1 directly.

## Getting started

```powershell
pnpm install
pnpm dev:web
```

The regular Next.js development server runs at `http://localhost:3000`.
Cloudflare-compatible production preview is available with:

```powershell
pnpm preview:web
```

Run the API Worker locally in a second terminal:

```powershell
pnpm dev:api
```

The API Worker uses one D1 database per Wrangler environment. Apply the existing
forward-only migrations before using persistent catalog, identity, commerce, or
payment routes:

```powershell
pnpm --filter @carbon/api db:migrate:local
pnpm --filter @carbon/api db:migrate:development
pnpm --filter @carbon/api db:migrate:staging
pnpm --filter @carbon/api db:migrate:production
```

The remote database IDs are committed in `apps/api/wrangler.jsonc`. Production
secrets and payment-provider configuration remain deployment-specific and are
not stored in the repository.

Better Auth is available behind `AUTH_MODE=better-auth`. Before enabling it in
staging or production, apply migration `0014_better_auth.sql`, set
`BETTER_AUTH_URL` to the API origin, set `CORS_ORIGINS` to the allowed web
origins, and store a random secret of at least 32 characters with Wrangler:

```powershell
pnpm --filter @carbon/api exec wrangler secret put BETTER_AUTH_SECRET --env staging
pnpm --filter @carbon/api exec wrangler secret put BETTER_AUTH_SECRET --env production
```

Keep `AUTH_MODE=persistent-session` as the local or migration fallback. Never
commit the Better Auth secret.

Its health endpoints are `/health` and `/api/v1/health`.

This builds `.open-next` and starts the app through Wrangler. The first real
deployment also needs the three R2 cache buckets from `apps/web/wrangler.jsonc`
created in the target Cloudflare account.

OpenNext's worker bundler relies on symlinks that are not reliably supported by
Windows. Run `preview:web` and the deployment commands from WSL or Linux; the
regular `dev:web`, checks, and Next build work directly in PowerShell.

Useful checks:

```powershell
pnpm check
pnpm build:web
pnpm --filter @carbon/web cf-typegen
```

Deploy staging or production from WSL/Linux after authenticating Wrangler:

```powershell
pnpm deploy:web:staging
pnpm deploy:web:production
```

For a single-command, staging-only web build and deployment from Ubuntu WSL, run this from the
repository root. It keeps Linux dependencies in a temporary Ubuntu directory and does not deploy
production:

```bash
bash scripts/deploy-web-staging-wsl.sh
```

The API Worker uses the same environment names:

```powershell
pnpm deploy:api:staging
pnpm deploy:api:production
```

Deploy the asynchronous workers after the API is live. Create the environment-specific queues
declared in `apps/jobs/wrangler.jsonc` first, then deploy jobs and workflows:

```powershell
pnpm deploy:jobs:staging
pnpm deploy:workflows:staging
pnpm deploy:jobs:production
pnpm deploy:workflows:production
```

Better Auth verification and password-reset email uses Cloudflare Email Service. Onboard and
verify the sending domain in Cloudflare Email Service, then use the `EMAIL` `send_email` binding
and `EMAIL_FROM` address declared in `apps/api/wrangler.jsonc`; no SMTP/API email secret is needed.

`NOTIFICATION_ENDPOINT` is intentionally not configured for staging or production yet. It is an
outbound provider API for delivery-event notifications, not the public application URL. Do not set
it to the web or API domain. The API can still process payment and retention lanes; delivery-event
notifications remain disabled until a real notification provider is selected.

The current deployment domains are `api-staging.getscenepass.com`, `app-staging.getscenepass.com`,
`api.getscenepass.com`, and `app.getscenepass.com`. Wrangler's `--domains` deployment option
provisions the custom Worker domains in the Cloudflare zone.

Production secrets are per-Worker secrets managed with `wrangler secret`, not account-level
Secrets Store values. List names (never secret values) with:

```powershell
pnpm --filter @carbon/api exec wrangler secret list --env production
pnpm --filter @carbon/jobs exec wrangler secret list --env production
```

For a double-clickable setup, use `scripts/set-worker-secrets-staging.cmd`. It generates and
uploads the Better Auth and event-processor secrets, shares the event token with the jobs Worker,
and removes its temporary local files. `scripts/set-worker-secrets-production.cmd` does the same for
production but asks for confirmation first. Neither launcher creates or changes Cloudflare Account
Secrets Store values.
