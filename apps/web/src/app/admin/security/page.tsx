import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "../../../components/layout";
import { AdminMfaSetup } from "../../../features/auth";
import { requireSession } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administrator security" };

export default async function AdminSecurityPage() {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/forbidden");
  if (!session.mfaRequired || session.mfaVerified) redirect("/admin");

  return (
    <AppShell
      breadcrumbs={[
        { href: "/", label: "Storefront" },
        { href: "/admin", label: "Operations" },
        { label: "Security setup" },
      ]}
      description="Complete the required security check before accessing administrator data."
      eyebrow="Administrator security"
      session={session}
      title="Set up two-factor authentication"
    >
      <AdminMfaSetup />
    </AppShell>
  );
}
