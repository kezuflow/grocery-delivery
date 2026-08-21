import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { AppShell } from "../../../../components/layout";
import { DeliveryAssignmentCard } from "../../../../features/delivery";
import { createApiClient } from "../../../../lib/api/client";
import { requireRole } from "../../../../lib/auth";
import { createRuntimeApiTransport } from "../../../../lib/api/runtime";

export const dynamic = "force-dynamic";

export default async function DeliveryAssignmentPage({
  params,
}: Readonly<{ params: Promise<{ assignmentId: string }> }>) {
  const session = await requireRole("deliveryman");
  const { assignmentId } = await params;
  const client = createApiClient(createRuntimeApiTransport());
  const assignments = await client.getDeliverymanAssignments({
    headers: { cookie: (await cookies()).toString() },
  });
  const assignment = assignments.data.assignments.find((item) => item.id === assignmentId);
  if (!assignment) notFound();

  return (
    <AppShell
      breadcrumbs={[
        { href: "/deliveryman", label: "Dashboard" },
        { href: "/deliveryman/assignments", label: "Assignments" },
        { label: `Order ${assignment.orderId}` },
      ]}
      description="Review the address, contact details, and next valid action for this stop."
      eyebrow="Assignment detail"
      session={session}
      title={`Order ${assignment.orderId}`}
    >
      <DeliveryAssignmentCard assignment={assignment} />
    </AppShell>
  );
}
