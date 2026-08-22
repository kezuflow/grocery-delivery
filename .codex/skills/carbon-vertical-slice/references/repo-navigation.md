# Repository Navigation

Start with `rg --files` and `rg -n` from the repository root. The ownership map is:

- `apps/web`: Next.js routes, server reads, UI features, API proxy, Playwright.
- `apps/api`: Hono routes, authentication, request validation, runtime composition.
- `packages/contracts`: Zod request/response schemas and OpenAPI-facing types.
- `packages/application`: use cases, command/query boundaries, orchestration.
- `packages/domain`: pure business rules and value objects.
- `packages/db`: repository implementations, schema helpers, forward-only migrations.
- `packages/auth`, `billing`, `notifications`, `storage`, `observability`, `config`: isolated
  infrastructure boundaries.
- `apps/jobs`, `apps/workflows`: queue consumers, scheduled work, and durable orchestration.

Trace a feature by searching its route or endpoint name, then follow imports downward. A web route
should remain thin: metadata, authorization, server reads, and composition. Generic UI primitives
must not import API clients or business rules. Domain code must not import Workers, Hono, D1,
Next.js, or payment SDKs.

Before editing, inspect the nearest `AGENTS.md`, package manifest, tests, and existing public
exports. Keep new files in the owning module and use public `index.ts` exports only across layer
boundaries.
