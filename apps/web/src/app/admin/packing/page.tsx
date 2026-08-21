import type { Metadata } from "next";
import { AdminWorkspacePage } from "../workspace-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Packing" };
export default function PackingPage() {
  return <AdminWorkspacePage permission="packing" title="Packing" />;
}
