import type { ReactNode } from "react";

import type { AdminPermission } from "../../lib/permissions";
import type { AdminDashboardData } from "../../lib/admin";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
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
      {permission === "procurement" ? <ProcurementPanel dashboard={dashboard} /> : null}
      {permission === "packing" ? <PackingPanel dashboard={dashboard} /> : null}
      {permission === "dispatch" ? <DispatchPanel dashboard={dashboard} /> : null}
      {permission === "support" ? <SupportPanel dashboard={dashboard} /> : null}
      {permission === "marketing" ? <PromotionsPanel dashboard={dashboard} /> : null}
      {permission === "superadmin" ? <LaunchConfigurationForm /> : null}
      {showActions ? (
        <AdminActions
          scope={permission}
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

function ProcurementPanel({ dashboard }: Readonly<{ dashboard: AdminDashboardData }>) {
  const procurement = dashboard.procurement;
  if (!procurement) return <UnavailableState label="Procurement feed" />;
  return (
    <div className="grid gap-5">
      <WorkspaceTable
        title="Demand queue"
        description="Order demand and purchase progress for the active cycle."
      >
        <TableHeader>
          <tr>
            <TableHeaderCell>SKU</TableHeaderCell>
            <TableHeaderCell>Ordered</TableHeaderCell>
            <TableHeaderCell>Purchased</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </tr>
        </TableHeader>
        <TableBody>
          {procurement.demand.map((item) => (
            <tr key={item.skuId}>
              <TableCell className="font-medium">{item.skuId}</TableCell>
              <TableCell>{item.orderedQuantity}</TableCell>
              <TableCell>{item.purchasedQuantity}</TableCell>
              <TableCell>
                <StatusPill status={item.status} />
              </TableCell>
            </tr>
          ))}
        </TableBody>
      </WorkspaceTable>
      <WorkspaceTable
        title="Shortages"
        description="Exceptions requiring a purchase or approved substitution."
      >
        <TableHeader>
          <tr>
            <TableHeaderCell>Shortage</TableHeaderCell>
            <TableHeaderCell>SKU</TableHeaderCell>
            <TableHeaderCell>Requested</TableHeaderCell>
            <TableHeaderCell>Available</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
          </tr>
        </TableHeader>
        <TableBody>
          {procurement.shortages.map((item) => (
            <tr key={item.id}>
              <TableCell className="font-medium">{item.id}</TableCell>
              <TableCell>{item.skuId}</TableCell>
              <TableCell>{item.requestedQuantity}</TableCell>
              <TableCell>{item.availableQuantity}</TableCell>
              <TableCell>
                <StatusPill status={item.status} />
              </TableCell>
            </tr>
          ))}
        </TableBody>
      </WorkspaceTable>
    </div>
  );
}

function PackingPanel({ dashboard }: Readonly<{ dashboard: AdminDashboardData }>) {
  const manifests = dashboard.procurement?.manifests ?? [];
  return (
    <WorkspaceTable
      title="Packing manifests"
      description="Track every order manifest through packing and exceptions."
    >
      <TableHeader>
        <tr>
          <TableHeaderCell>Manifest</TableHeaderCell>
          <TableHeaderCell>Order</TableHeaderCell>
          <TableHeaderCell>Created</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </tr>
      </TableHeader>
      <TableBody>
        {manifests.map((item) => (
          <tr key={item.id}>
            <TableCell className="font-medium">{item.id}</TableCell>
            <TableCell>{item.orderId}</TableCell>
            <TableCell>{new Date(item.createdAt).toLocaleDateString("en-PH")}</TableCell>
            <TableCell>
              <StatusPill status={item.status} />
            </TableCell>
          </tr>
        ))}
      </TableBody>
    </WorkspaceTable>
  );
}

function DispatchPanel({ dashboard }: Readonly<{ dashboard: AdminDashboardData }>) {
  const assignments = dashboard.dispatch?.assignments ?? [];
  return (
    <WorkspaceTable
      title="Dispatch board"
      description="Delivery windows, drivers, and fulfillment state for this cycle."
    >
      <TableHeader>
        <tr>
          <TableHeaderCell>Order</TableHeaderCell>
          <TableHeaderCell>Window</TableHeaderCell>
          <TableHeaderCell>Driver</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </tr>
      </TableHeader>
      <TableBody>
        {assignments.map((item) => (
          <tr key={item.id}>
            <TableCell className="font-medium">{item.orderId}</TableCell>
            <TableCell>{item.windowId}</TableCell>
            <TableCell>{item.deliverymanUserId}</TableCell>
            <TableCell>
              <StatusPill status={item.status} />
            </TableCell>
          </tr>
        ))}
      </TableBody>
    </WorkspaceTable>
  );
}

function SupportPanel({ dashboard }: Readonly<{ dashboard: AdminDashboardData }>) {
  const cases = dashboard.supportCases;
  return (
    <WorkspaceTable
      title="Support queue"
      description="Customer cases awaiting triage or resolution."
    >
      <TableHeader>
        <tr>
          <TableHeaderCell>Case</TableHeaderCell>
          <TableHeaderCell>Subject</TableHeaderCell>
          <TableHeaderCell>Customer</TableHeaderCell>
          <TableHeaderCell>Updated</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </tr>
      </TableHeader>
      <TableBody>
        {cases.map((item) => (
          <tr key={item.id}>
            <TableCell className="font-medium">{item.id}</TableCell>
            <TableCell>{item.subject}</TableCell>
            <TableCell>{item.customerId}</TableCell>
            <TableCell>{new Date(item.updatedAt).toLocaleDateString("en-PH")}</TableCell>
            <TableCell>
              <StatusPill status={item.status} />
            </TableCell>
          </tr>
        ))}
      </TableBody>
    </WorkspaceTable>
  );
}

function PromotionsPanel({ dashboard }: Readonly<{ dashboard: AdminDashboardData }>) {
  return (
    <WorkspaceTable
      title="Campaigns"
      description="Review status, redemption volume, and budget before taking action."
    >
      <TableHeader>
        <tr>
          <TableHeaderCell>Code</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Redemptions</TableHeaderCell>
          <TableHeaderCell>Window</TableHeaderCell>
        </tr>
      </TableHeader>
      <TableBody>
        {dashboard.promotions.map((item) => (
          <tr key={item.id}>
            <TableCell className="font-medium">{item.code ?? item.id}</TableCell>
            <TableCell>
              <StatusPill status={item.status} />
            </TableCell>
            <TableCell>{item.redemptionCount}</TableCell>
            <TableCell>
              {new Date(item.startsAt).toLocaleDateString("en-PH")} -{" "}
              {new Date(item.endsAt).toLocaleDateString("en-PH")}
            </TableCell>
          </tr>
        ))}
      </TableBody>
    </WorkspaceTable>
  );
}

function WorkspaceTable({
  title,
  description,
  children,
}: Readonly<{ title: string; description: string; children: ReactNode }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <Table>{children}</Table>
    </Card>
  );
}

function UnavailableState({ label }: Readonly<{ label: string }>) {
  return (
    <EmptyState
      description="The server feed is unavailable or returned no rows for this cycle."
      title={`${label} unavailable`}
    />
  );
}
