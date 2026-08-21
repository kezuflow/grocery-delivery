import type { AdminPermission } from "../../lib/permissions";
import { AdminWorkspace } from "../../features/admin-workspaces";
import { loadAdminDashboard } from "../../lib/admin";
import { requirePermission } from "../../lib/auth";
import { getEffectiveAdminPermissions } from "../../lib/permissions";
import { AppShell } from "../../components/layout";

export async function AdminWorkspacePage({
  permission,
  title,
}: Readonly<{ permission: AdminPermission; title: string }>) {
  const session = await requirePermission(permission);
  const permissions = getEffectiveAdminPermissions(session);
  const dashboard = await loadAdminDashboard(permissions);
  return (
    <AppShell
      breadcrumbs={[
        { href: "/", label: "Storefront" },
        { href: "/admin", label: "Operations" },
        { label: title },
      ]}
      description="Server-validated operational workspace for the active delivery cycle."
      eyebrow="Operations workspace"
      session={session}
      title={title}
    >
      <AdminWorkspace dashboard={dashboard} permission={permission} permissions={permissions} />
    </AppShell>
  );
}
