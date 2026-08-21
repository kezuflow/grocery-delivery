import type { AdminPermission } from "../../lib/permissions";
import type { AdminDashboardData } from "../../lib/admin";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusPill,
} from "../../components/ui";
import { AdminActions } from "./admin-actions";
import { LaunchConfigurationForm } from "./launch-configuration-form";

const titles: Record<AdminPermission, Readonly<{ title: string; description: string }>> = {
  catalog: {
    title: "Catalog",
    description: "Catalog administration is available from the approved launch configuration.",
  },
  pricing: {
    title: "Pricing",
    description: "Pricing is resolved from server-owned plan and catalog configuration.",
  },
  marketing: {
    title: "Promotions",
    description: "Review active campaign states and redemption activity.",
  },
  finance: { title: "Finance", description: "Review refund requests and payment operations." },
  procurement: {
    title: "Procurement",
    description: "Manage demand, purchases, shortages, and substitutions for the active cycle.",
  },
  packing: { title: "Packing", description: "Track manifests and record packing exceptions." },
  dispatch: { title: "Dispatch", description: "Assign delivery windows and delivery staff." },
  support: { title: "Support", description: "Handle customer cases and order requests." },
  reporting: {
    title: "Reporting",
    description: "Review operational projections, alerts, and audit activity.",
  },
  staff: {
    title: "Staff",
    description:
      "Staff administration remains server-owned and will be expanded in a later increment.",
  },
  superadmin: {
    title: "Configuration",
    description: "Apply an approved launch manifest with server-derived prices.",
  },
};

export function AdminWorkspace({
  permission,
  dashboard,
  permissions,
}: Readonly<{
  permission: AdminPermission;
  dashboard: AdminDashboardData;
  permissions: readonly AdminPermission[];
}>) {
  const copy = titles[permission];
  const showActions = [
    "procurement",
    "packing",
    "dispatch",
    "support",
    "finance",
    "marketing",
  ].includes(permission);
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-3 text-sm">
          <StatusPill status={permission} />
          <span className="text-muted">
            Cycle{" "}
            {dashboard.projection?.cycleId ??
              dashboard.procurement?.cycleId ??
              dashboard.dispatch?.cycleId ??
              "Unavailable"}
          </span>
        </div>
      </Card>
      {permission === "reporting" ? <ReportingPanel dashboard={dashboard} /> : null}
      {permission === "superadmin" ? <LaunchConfigurationForm /> : null}
      {showActions ? (
        <AdminActions
          permissions={permissions}
          procurement={dashboard.procurement}
          promotions={dashboard.promotions}
          supportCases={dashboard.supportCases}
          orderRequests={dashboard.orderRequests}
        />
      ) : null}
      {!showActions && permission !== "reporting" && permission !== "superadmin" ? (
        <EmptyState
          description="This workspace is permission-protected and ready for its next dedicated controls."
          title="Workspace available"
        />
      ) : null}
    </div>
  );
}

function ReportingPanel({ dashboard }: Readonly<{ dashboard: AdminDashboardData }>) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>Server-generated operational thresholds.</CardDescription>
        </CardHeader>
        {dashboard.projection?.alerts.length ? (
          <ul className="grid gap-3">
            {dashboard.projection.alerts.map((alert) => (
              <li className="border-b border-line pb-3 last:border-0" key={alert.id}>
                <strong>{alert.message}</strong>
                <p className="mt-1 text-xs text-muted">
                  {alert.severity} · observed {alert.observedValue} · threshold {alert.threshold}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No active alerts.</p>
        )}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Audit activity</CardTitle>
          <CardDescription>Recent server-recorded actions.</CardDescription>
        </CardHeader>
        {dashboard.auditEvents.length ? (
          <ul className="grid gap-3">
            {dashboard.auditEvents.map((event) => (
              <li className="border-b border-line pb-3 last:border-0" key={event.id}>
                <strong>{event.action}</strong>
                <p className="mt-1 text-xs text-muted">
                  {event.targetType} · {new Date(event.occurredAt).toLocaleString("en-PH")}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No audit events available.</p>
        )}
      </Card>
    </div>
  );
}
