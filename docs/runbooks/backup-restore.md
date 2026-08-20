# Backup and restore rehearsal

Run against a disposable staging D1 database only. Never place production credentials in a local
shell history or rehearsal fixture.

1. Apply migrations with `pnpm --filter @carbon/api db:migrate:staging`.
2. Export a bounded staging snapshot using the Cloudflare dashboard or `wrangler d1 export`.
3. Record the export checksum and migration number in the rehearsal ticket.
4. Restore into a new disposable database, apply no application writes, and verify health plus the
   operational projection endpoint.
5. Delete the disposable database and attach the command output and checksum to the ticket.

The credential-free preflight is `pnpm rehearsal:check backup-restore`.
