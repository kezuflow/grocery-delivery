import type { Metadata } from "next";
import { AdminWorkspacePage } from "../workspace-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dispatch" };
export default function DispatchPage() {
  return <AdminWorkspacePage permission="dispatch" title="Dispatch" />;
}
