# Incident-response preparation

Keep the correlation ID, deployment version, affected route, and time window in every incident
record. Triage health and API metrics first, then rate-limit or pause the affected write surface,
preserve the outbox and webhook evidence, and prefer replay-safe recovery. Escalate payment issues
to finance before refunds or provider changes. Record all emergency configuration changes and revert
them after verification.

The credential-free preflight is `pnpm rehearsal:check incident`.
