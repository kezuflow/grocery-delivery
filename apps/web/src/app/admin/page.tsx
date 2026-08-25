import type { Metadata } from "next";

import { AppShell } from "../../components/layout";
import { AdminOverview } from "../../features/admin-overview";
import { loadAdminDashboard } from "../../lib/admin";
import { requireRole } from "../../lib/auth";
import { getEffectiveAdminPermissions } from "../../lib/permissions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Operations" };

export default async function AdminPage() {
  const session = await requireRole("admin");
  const permissions = getEffectiveAdminPermissions(session);
  const dashboard = await loadAdminDashboard(permissions);
  return (
    <AppShell
      breadcrumbs={[{ href: "/", label: "Storefront" }, { label: "Operations" }]}
      description="Monitor the active delivery cycle and open only the workspaces your role is responsible for."
      eyebrow="Operations console"
      session={session}
      status={
        <span className="inline-flex items-center gap-2 rounded-md bg-admin-success-soft px-2.5 py-1.5 text-xs font-medium text-admin-accent">
          <span className="size-1.5 rounded-full bg-current" />
          {session.adminPermissions.join(", ") || "admin"}
        </span>
      }
      title="Weekly operations"
    >
      <AdminOverview dashboard={dashboard} permissions={permissions} />
    </AppShell>
  );
}
