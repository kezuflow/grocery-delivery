import { cookies } from "next/headers";

import { createApiClient } from "../../lib/api/client";
import { createRuntimeApiTransport } from "../../lib/api/runtime";
import { requireRole } from "../../lib/auth";
import { AppShell } from "../../components/layout";
import { DeliverymanConsole } from "./console";

export const dynamic = "force-dynamic";

export default async function DeliverymanPage() {
  const session = await requireRole("deliveryman");
  const cookieHeader = (await cookies()).toString();
  const assignments = await createApiClient(createRuntimeApiTransport()).getDeliverymanAssignments({
    headers: { cookie: cookieHeader },
  });
  return (
    <AppShell
      breadcrumbs={[{ href: "/", label: "Storefront" }, { label: "Assignments" }]}
      description="Work through your assigned route and record delivery events as they happen."
      eyebrow="Delivery route"
      session={session}
      status={<span className="account-status">{assignments.data.cycleId}</span>}
      title="Assignments"
    >
      <DeliverymanConsole initial={assignments.data} />
    </AppShell>
  );
}
