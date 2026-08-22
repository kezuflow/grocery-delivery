<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Frontend Architecture Rules

Before changing frontend structure or styling, read `../../docs/frontend-standards.md`.

- Treat the implemented API, shared contracts, typed web client, authentication, RBAC, and
  connected customer/admin/delivery workflows as the existing product baseline. Inspect and
  preserve them; do not recreate or replace them from a historical frontend plan. Current scope
  comes from `docs/implementation-backlog.md` and its `AUD-*`/`VS-*` queue.
- Follow this dependency order: tokens -> UI primitives -> layouts -> features -> routes.
- Reuse an existing token, primitive, or feature component before creating another one.
- Keep route files focused on data loading, authorization, metadata, and composition.
- Keep generic UI components free of API calls, sessions, permissions, and business rules.
- Use semantic design tokens and named component variants instead of repeated arbitrary values.
- Keep Tailwind classes local when they describe one-off layout; extract repeated visual behavior.
- Preserve server ownership of prices, totals, roles, permissions, statuses, and availability.
- Include responsive, keyboard, focus, loading, empty, error, disabled, and success states.
- Run the relevant Playwright role, responsive, accessibility, and visual checks in every vertical
  slice that changes a user workflow. Continue focused unit/component checks, production builds,
  and the repository `pnpm check` for every slice.
