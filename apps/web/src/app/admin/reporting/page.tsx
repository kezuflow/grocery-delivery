import type { Metadata } from "next";
import { AdminWorkspacePage } from "../workspace-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reporting" };
export default function ReportingPage() {
  return <AdminWorkspacePage permission="reporting" title="Reporting" />;
}
