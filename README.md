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

The API Worker uses the same environment names:

```powershell
pnpm deploy:api:staging
pnpm deploy:api:production
```
