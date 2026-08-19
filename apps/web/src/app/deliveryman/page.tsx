import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createApiClient } from "../../lib/api/client";
import { createRuntimeApiTransport } from "../../lib/api/runtime";
import { loadCurrentSession } from "../../lib/session";
import { DeliverymanConsole } from "./console";

export const dynamic = "force-dynamic";

export default async function DeliverymanPage() {
  const auth = await loadCurrentSession();
  if (!auth.session || auth.session.role !== "deliveryman") redirect("/");
  const cookieHeader = (await cookies()).toString();
  const assignments = await createApiClient(createRuntimeApiTransport()).getDeliverymanAssignments({
    headers: { cookie: cookieHeader },
  });
  return <DeliverymanConsole initial={assignments.data} />;
}
