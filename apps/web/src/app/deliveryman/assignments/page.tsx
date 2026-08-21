import { cookies } from "next/headers";

import { AppShell } from "../../../components/layout";
import { DeliveryDashboard } from "../../../features/delivery";
import { createApiClient } from "../../../lib/api/client";
import { requireRole } from "../../../lib/auth";
import { createRuntimeApiTransport } from "../../../lib/api/runtime";

export const dynamic = "force-dynamic";

export default async function DeliveryAssignmentsPage() {
  const session = await requireRole("deliveryman");
  const assignments = await createApiClient(createRuntimeApiTransport()).getDeliverymanAssignments({
    headers: { cookie: (await cookies()).toString() },
  });

  return (
    <AppShell
      breadcrumbs={[{ href: "/deliveryman", label: "Dashboard" }, { label: "Assignments" }]}
      description="Record the next server-approved event for each assigned stop."
      eyebrow="Delivery route"
      session={session}
      title="Assignments"
    >
      <DeliveryDashboard initial={assignments.data} />
    </AppShell>
  );
}
