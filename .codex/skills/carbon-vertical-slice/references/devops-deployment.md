# DevOps And Deployment

Use Wrangler environments explicitly: development, staging, and production. Web deploys build
OpenNext before Wrangler deployment; API, Jobs, and Workflows deploy independently with matching
environment bindings and service names. Apply D1 migrations forward-only, before dependent code,
and record the migration result.

A release record must identify commit, environment, migrations, deployed Worker versions, smoke
checks, observability links, and rollback target. Staging evidence must come from staging; local
fixtures cannot be presented as staging proof. Roll back code and configuration independently from
data; never assume a destructive migration is reversible. Keep secrets out of Git and verify
bindings/config against generated Wrangler types.

Use the repository scripts and package deploy commands. Before pushing, inspect status, diff check,
staged diff, and commit convention. Do not deploy production without explicit user authorization.
