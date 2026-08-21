import { cookies } from "next/headers";

import { AppShell } from "../../../components/layout";
import { DeliveryHistory } from "../../../features/delivery";
import { createApiClient } from "../../../lib/api/client";
import { requireRole } from "../../../lib/auth";
import { createRuntimeApiTransport } from "../../../lib/api/runtime";

export const dynamic = "force-dynamic";

export default async function DeliveryHistoryPage() {
  const session = await requireRole("deliveryman");
  const assignments = await createApiClient(createRuntimeApiTransport()).getDeliverymanAssignments({
    headers: { cookie: (await cookies()).toString() },
  });

  return (
    <AppShell
      breadcrumbs={[{ href: "/deliveryman", label: "Dashboard" }, { label: "History" }]}
      description="Server-received events for your current cycle."
      eyebrow="Delivery history"
      session={session}
      title="History"
    >
      <DeliveryHistory initial={assignments.data} />
    </AppShell>
  );
}
