import type { Metadata } from "next";
import { AdminWorkspacePage } from "../workspace-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support operations" };
export default function SupportPage() {
  return <AdminWorkspacePage permission="support" title="Support operations" />;
}
