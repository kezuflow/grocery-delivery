import type { Metadata } from "next";

import { AppShell } from "../../../components/layout";
import { AdminStaff } from "../../../features/admin-staff";
import { loadAdminStaff } from "../../../lib/admin-product";
import { requirePermission } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Staff administration" };

export default async function AdminStaffPage() {
  const session = await requirePermission("superadmin");
  const data = await loadAdminStaff();
  return (
    <AppShell
      breadcrumbs={[
        { href: "/", label: "Storefront" },
        { href: "/admin", label: "Operations" },
        { label: "Staff" },
      ]}
      description="Assign server-owned roles and review audited authority changes. Administrator assignments require MFA."
      eyebrow="Identity operations"
      session={session}
      title="Staff"
    >
      <AdminStaff data={data} />
    </AppShell>
  );
}
