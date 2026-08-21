import type { Metadata } from "next";
import { AdminWorkspacePage } from "../workspace-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configuration" };
export default function ConfigurationPage() {
  return <AdminWorkspacePage permission="superadmin" title="Configuration" />;
}
