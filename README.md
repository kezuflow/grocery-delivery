# Carbon Food Delivery

Carbon Food Delivery is a pnpm + Turborepo monorepo for the Carbon grocery
platform.

## Repository shape

```text
apps/
  web/          Next.js App Router application with a Cloudflare Workers runtime
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

The API Worker uses one D1 database per Wrangler environment. Local development is the active
phase. Apply the existing forward-only migrations to local D1 before using persistent catalog,
identity, commerce, or payment routes:

```powershell
pnpm --filter @carbon/api db:migrate:local
```

Keep `AUTH_MODE=persistent-session` as the local development default. Better Auth and remote secret
provisioning are promotion concerns and should not block local product iteration. Never commit
secrets.

Its health endpoints are `/health` and `/api/v1/health`.

This builds `.open-next` and starts the app through Wrangler. OpenNext's worker bundler relies on
symlinks that are not reliably supported by Windows, so use WSL or Linux for `preview:web` when
needed. Regular `dev:web`, checks, and the Next build work directly in PowerShell.

Useful checks:

```powershell
pnpm check
pnpm build:web
pnpm --filter @carbon/web cf-typegen
```

## Promotion

Staging and production scripts, Wrangler environments, runbooks, and historical evidence remain in
the repository for later use. Do not run remote migrations, publish fixture data, provision secrets,
deploy Workers, or use release scripts until the user explicitly starts a staging or production
promotion phase.
