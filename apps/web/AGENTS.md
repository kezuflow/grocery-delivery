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
- Run the relevant local Playwright role, responsive, accessibility, and visual checks in every
  vertical slice that changes a user workflow. Continue focused unit/component checks, local web
  builds, and the repository `pnpm check` for every slice.
- Use local API/D1 data and deterministic fixtures while iterating. Do not require or invoke a
  deployed staging workflow unless the user explicitly starts a staging phase.

## Admin Dashboard Design Authority

For work inside `src/app/admin`, admin layout components, or `src/features/admin-*`, follow this
order after product requirements and repository-wide brand rules:

1. `../../docs/design/admin/DESIGN.md`
2. existing semantic design tokens
3. existing reusable admin components
4. `../../docs/design/admin/COMPONENTS.md`
5. `../../docs/design/admin/REFERENCES.md`
6. fresh Mobbin references when a new problem is not covered

Customer.io/Mobbin controls UX and structural inspiration for the admin dashboard.
`../../docs/design/admin/DESIGN.md` controls Carbon's admin visual identity and implementation
rules. Customer.io-derived rules apply only to the admin dashboard and must not be propagated to
the landing page or customer marketplace.

Before creating a new admin screen, identify the established page archetype and reusable components
that should generate it. Do not design admin pages independently.
