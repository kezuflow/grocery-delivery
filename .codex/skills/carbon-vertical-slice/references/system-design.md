# System Design

Use `docs/architecture/production-plan.md` as the accepted topology and domain baseline. The
runtime is Browser/PWA -> Next.js Web Worker -> Hono API Worker -> D1/R2/Queues/adapters, with
Workflow and Jobs Workers handling scheduled and asynchronous work.

For each slice, document actors and role boundaries, the synchronous request path and every
asynchronous handoff, source-of-truth data versus projections and caches, consistency expectations,
timeout/retry/duplicate/partial-failure/replay behavior, security boundaries, capacity-sensitive
operations, observable signals, rollout, migration, and rollback behavior.

Use D1 for transactional truth, repositories for persistence access, R2 for bulky artifacts, KV or
Cache API only for disposable/cacheable state, Queues for retryable work, and Workflows for durable
multi-step orchestration. Do not introduce a Durable Object or global mutable Worker state for
business truth without a written architecture decision.

Prefer one bounded command/query path per outcome over a broad cross-module join. Operational
dashboards should consume projections when synchronous joins would grow with order volume.
