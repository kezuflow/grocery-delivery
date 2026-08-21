import type { Metadata } from "next";
import { AdminWorkspacePage } from "../workspace-page";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Promotions" };
export default function PromotionsPage() {
  return <AdminWorkspacePage permission="marketing" title="Promotions" />;
}
