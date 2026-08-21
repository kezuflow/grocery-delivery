import { cookies } from "next/headers";

import { AppShell } from "../../../components/layout";
import { DeliveryDashboard } from "../../../features/delivery";
import { createApiClient } from "../../../lib/api/client";
import { requireRole } from "../../../lib/auth";
import { createRuntimeApiTransport } from "../../../lib/api/runtime";

export const dynamic = "force-dynamic";

export default async function DeliveryRoutePage() {
  const session = await requireRole("deliveryman");
  const response = await createApiClient(createRuntimeApiTransport()).getDeliverymanAssignments({
    headers: { cookie: (await cookies()).toString() },
  });
  const initial = {
    ...response.data,
    assignments: [...response.data.assignments].sort(
      (left, right) => left.routeSequence - right.routeSequence,
    ),
  };

  return (
    <AppShell
      breadcrumbs={[{ href: "/deliveryman", label: "Dashboard" }, { label: "Route" }]}
      description="Your stops are ordered by the server-provided route sequence."
      eyebrow="Delivery route"
      session={session}
      title="Route"
    >
      <DeliveryDashboard initial={initial} />
    </AppShell>
  );
}
