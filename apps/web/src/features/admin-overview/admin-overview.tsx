import type { AdminDashboardData } from "../../lib/admin";
import type { AdminPermission } from "../../lib/permissions";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  LinkButton,
  StatusPill,
} from "../../components/ui";
import { visibleAdminWorkspaceLinks } from "./workspace-links";

export function AdminOverview({
  dashboard,
  permissions,
}: Readonly<{ dashboard: AdminDashboardData; permissions: readonly AdminPermission[] }>) {
  const projection = dashboard.projection;
  const links = visibleAdminWorkspaceLinks(permissions);
  return (
    <div className="grid gap-8">
      <section
        aria-label="Weekly operations metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          label="Cycle"
          value={projection?.cycleId ?? "Unavailable"}
          note={
            projection
              ? `Updated ${new Date(projection.generatedAt).toLocaleString("en-PH")}`
              : "Reporting access required"
          }
        />
        <MetricCard
          label="Pending outbox"
          value={String(projection?.outbox.pendingCount ?? 0)}
          note={`${projection?.outbox.deadLetteredCount ?? 0} dead-lettered`}
        />
        <MetricCard
          label="Open shortages"
          value={String(projection?.procurement.openShortages ?? 0)}
          note={`${projection?.procurement.exceptionalManifests ?? 0} packing exceptions`}
        />
        <MetricCard
          label="Deliveries"
          value={String(
            projection?.delivery.totalAssignments ?? dashboard.dispatch?.assignments.length ?? 0,
          )}
          note={`${projection?.delivery.failed ?? 0} failed`}
        />
      </section>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Operational alerts</CardTitle>
            <CardDescription>
              Prioritized server-generated warnings for the active cycle.
            </CardDescription>
          </CardHeader>
          {projection?.alerts.length ? (
            <ul className="grid gap-3">
              {projection.alerts.map((alert) => (
                <li
                  className="flex flex-col gap-2 border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={alert.id}
                >
                  <div>
                    <strong>{alert.message}</strong>
                    <p className="mt-1 text-xs text-muted">
                      Observed {alert.observedValue}; threshold {alert.threshold}
                    </p>
                  </div>
                  <StatusPill status={alert.severity} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              description="No alert thresholds are currently exceeded."
              title="Operations are clear"
            />
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Only workspaces allowed by your server-owned permissions are shown.
            </CardDescription>
          </CardHeader>
          <div className="grid gap-3">
            {links.map((link) => (
              <div className="border-b border-line pb-3 last:border-0 last:pb-0" key={link.href}>
                <LinkButton href={link.href} size="sm" tone="secondary">
                  {link.label}
                </LinkButton>
                <p className="mt-2 text-xs leading-5 text-muted">{link.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cycle activity</CardTitle>
            <CardDescription>Current packing and campaign activity.</CardDescription>
          </CardHeader>
          <dl className="grid gap-3 text-sm">
            <MetricRow
              label="Packing manifests"
              value={dashboard.procurement?.manifests.length ?? 0}
            />
            <MetricRow
              label="Open support cases"
              value={dashboard.supportCases.filter((item) => item.status !== "resolved").length}
            />
            <MetricRow label="Order requests" value={dashboard.orderRequests.length} />
            <MetricRow label="Campaigns" value={dashboard.promotions.length} />
          </dl>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest visible audit events.</CardDescription>
          </CardHeader>
          {dashboard.auditEvents.length ? (
            <ul className="grid gap-3">
              {dashboard.auditEvents.slice(0, 5).map((event) => (
                <li className="border-b border-line pb-3 last:border-0" key={event.id}>
                  <strong>{event.action}</strong>
                  <p className="mt-1 text-xs text-muted">
                    {event.targetType} · {new Date(event.occurredAt).toLocaleString("en-PH")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Audit activity is available to reporting administrators.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
}: Readonly<{ label: string; value: string; note: string }>) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 break-words text-3xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-muted">{note}</p>
    </Card>
  );
}
function MetricRow({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
