# Cross-Cutting Governance

Read `docs/project-guidance.md` for the complete source hierarchy, change classification, slice
dossier, cross-cutting policies, and coverage matrix.

Prefer additive API and event changes. A breaking change needs an explicit version, consumer
migration, OpenAPI regeneration, deprecation/removal criteria, and rollback plan. Do not let web,
jobs, or workflows consume an unvalidated parallel DTO.

Keep non-secret operational values in validated configuration and secrets in Workers Secrets.
Critical staging/production configuration fails closed. Feature flags require an owner, default,
environment behavior, telemetry, rollback purpose, and deletion condition.

Justify new runtime dependencies and review maintenance, security, license, bundle/runtime cost,
and overlap with existing workspace capabilities. Update the lockfile intentionally. Do not
hand-edit generated files; regenerate tracked artifacts and remove build reports, traces, caches,
and temporary output before committing.

Persist UTC timestamps, assign cycles using `Asia/Manila`, and store PHP money as integer centavos.
Treat accessibility as functional correctness. Classify affected data, minimize collection/logs,
and define retention, export, correction, deletion, backup, restore, and authorization behavior.

Architecture changes need an explicit tradeoff decision in the accepted architecture or a linked
focused architecture note. Hotfixes require an incident reference, minimum safe scope, focused
verification, rollback target, and follow-up audit for deferred evidence.
