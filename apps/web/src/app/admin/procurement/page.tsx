import type { Metadata } from "next";
import { AdminWorkspacePage } from "../workspace-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Procurement" };
export default function ProcurementPage() {
  return <AdminWorkspacePage permission="procurement" title="Procurement" />;
}
