# Current Handoff: Slice 001, API D1 Foundation

Status: in progress

## Delivered

- Created separate Cloudflare D1 databases for development, staging, and production.
- Bound each Wrangler environment to `DB`.
- Pointed Wrangler at the forward-only migrations in `packages/db/migrations`.
- Added explicit local and remote migration scripts to `apps/api/package.json`.
- Documented the migration workflow in the root README.
- Fixed an authorization test that depended on the wall clock and expired after August 19, 2026.

## Infrastructure

| Environment | Database                           | Database ID                            |
| ----------- | ---------------------------------- | -------------------------------------- |
| development | `carbon-food-delivery-development` | `7c4d107e-87dc-43ed-9ea2-52f0435aa9aa` |
| staging     | `carbon-food-delivery-staging`     | `05a1e958-5e7d-451b-9cc3-dfab99778900` |
| production  | `carbon-food-delivery-production`  | `8472f405-c722-46e0-ba96-cfec387f283e` |

## Verification Remaining

1. Validate Wrangler configuration with a dry run.
2. Run `pnpm check`.
3. Apply local migrations with `pnpm --filter @carbon/api db:migrate:local`.
4. Commit and push this slice.
5. Record the commit in this file, push the update, then remove this file in a cleanup commit.

## Next Slice

Implement the API runtime configuration boundary for Better Auth and provider selection. Keep
credentials in Wrangler secrets, preserve the existing session resolver interfaces, and add a
health/configuration test that confirms missing production auth configuration fails clearly.

## Resume Notes

If work stops, inspect `git status`, read this file, and continue from the first unchecked item.
Do not recreate the D1 databases; reuse the IDs in `apps/api/wrangler.jsonc`. Pre-existing deletions
under `docs/ui-mockups` are user changes and must remain untouched.
