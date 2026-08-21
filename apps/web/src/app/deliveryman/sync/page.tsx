import { AppShell } from "../../../components/layout";
import { DeliverySyncPanel } from "../../../features/delivery";
import { requireRole } from "../../../lib/auth";

export default async function DeliverySyncPage() {
  const session = await requireRole("deliveryman");

  return (
    <AppShell
      breadcrumbs={[{ href: "/deliveryman", label: "Dashboard" }, { label: "Sync" }]}
      description="Review offline events and retry them when the connection is ready."
      eyebrow="Device sync"
      session={session}
      title="Sync"
    >
      <DeliverySyncPanel />
    </AppShell>
  );
}
