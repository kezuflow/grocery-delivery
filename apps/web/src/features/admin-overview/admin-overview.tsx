import {
  Activity,
  ArrowUpRight,
  BellRing,
  Box,
  CheckCircle2,
  CircleAlert,
  Clock3,
  PackageOpen,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";

import { AdminStatus, EmptyState } from "../../components/ui";
import type { AdminDashboardData, AdminFeedState } from "../../lib/admin";
import type { AdminPermission } from "../../lib/permissions";
import { visibleAdminWorkspaceLinks } from "./workspace-links";

export function AdminOverview({
  dashboard,
  permissions,
}: Readonly<{ dashboard: AdminDashboardData; permissions: readonly AdminPermission[] }>) {
  const projectionState = dashboard.states.projection;
  const projection = projectionState.status === "ready" ? dashboard.projection : null;
  const links = visibleAdminWorkspaceLinks(permissions);
  const openCases = countOpenCases(dashboard);
  const health = getHealth(dashboard);

  return (
    <div className="grid gap-8">
      <section aria-labelledby="pulse-heading" className="border-b border-admin-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-admin-text-muted">
              Operational pulse
            </p>
            <h2 className="mt-2 text-base font-semibold text-admin-text-primary" id="pulse-heading">
              Active delivery cycle
            </h2>
            <p className="mt-1 max-w-[58ch] text-sm leading-5 text-admin-text-secondary">
              Server-generated signals for the current cycle, with freshness and access context kept
              visible.
            </p>
          </div>
          <HealthStatus label={health.label} tone={health.tone} />
        </div>
        <div className="mt-6 grid divide-y divide-admin-border border-y border-admin-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <MetricSummary
            icon={<Clock3 aria-hidden="true" size={15} strokeWidth={1.8} />}
            label="Active cycle"
            note={
              projection
                ? `Updated ${formatDate(projection.generatedAt)}`
                : feedStateNote(projectionState)
            }
            value={projection?.cycleId ?? "Unavailable"}
          />
          <MetricSummary
            icon={<Activity aria-hidden="true" size={15} strokeWidth={1.8} />}
            label="Pending outbox"
            note={
              projection
                ? `${projection.outbox.deadLetteredCount} dead-lettered`
                : feedStateNote(projectionState)
            }
            value={projection ? String(projection.outbox.pendingCount) : "Unavailable"}
          />
          <MetricSummary
            icon={<PackageOpen aria-hidden="true" size={15} strokeWidth={1.8} />}
            label="Open shortages"
            note={
              projection
                ? `${projection.procurement.exceptionalManifests} packing exceptions`
                : feedStateNote(projectionState)
            }
            value={projection ? String(projection.procurement.openShortages) : "Unavailable"}
          />
          <MetricSummary
            icon={<Truck aria-hidden="true" size={15} strokeWidth={1.8} />}
            label="Deliveries"
            note={
              projection ? `${projection.delivery.failed} failed` : feedStateNote(projectionState)
            }
            value={projection ? String(projection.delivery.totalAssignments) : "Unavailable"}
          />
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
        <OverviewSection
          icon={<BellRing aria-hidden="true" size={16} />}
          title="Attention queue"
          description="Prioritized warnings from the operational projection."
          meta={projection ? `${projection.alerts.length} open` : feedStateLabel(projectionState)}
        >
          {projectionState.status === "unavailable" || projectionState.status === "forbidden" ? (
            <FeedStateNotice label="Operational alerts" state={projectionState} />
          ) : projection?.alerts.length ? (
            <ul className="divide-y divide-admin-border">
              {projection.alerts.map((alert) => (
                <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center" key={alert.id}>
                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700">
                    <CircleAlert aria-hidden="true" size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-admin-text-primary">{alert.message}</p>
                    <p className="mt-1 text-xs text-admin-text-muted">
                      Observed {alert.observedValue} · threshold {alert.threshold}
                    </p>
                  </div>
                  <AdminStatus status={alert.severity} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-4">
              <EmptyState
                description="No alert thresholds are currently exceeded."
                title="Operations are clear"
              />
            </div>
          )}
        </OverviewSection>
        <OverviewSection title="Cycle activity" description="Current processing volume.">
          <dl className="divide-y divide-admin-border border-y border-admin-border">
            <MetricRow
              label="Packing manifests"
              value={feedCount(
                dashboard.states.procurement,
                dashboard.procurement?.manifests.length,
              )}
            />
            <MetricRow label="Open support cases" value={openCases} />
            <MetricRow
              label="Order requests"
              value={feedCount(dashboard.states.orderRequests, dashboard.orderRequests.length)}
            />
            <MetricRow
              label="Campaigns"
              value={feedCount(dashboard.states.promotions, dashboard.promotions.length)}
            />
          </dl>
        </OverviewSection>
      </section>

      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <OverviewSection
          title="Workspaces"
          description="Tools available to your role."
          meta={`${links.length} available`}
        >
          <div className="grid divide-y divide-admin-border border-y border-admin-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {links.map((link) => (
              <a
                className="group flex min-h-[88px] items-start gap-3 py-4 transition-colors hover:bg-admin-surface-hover sm:px-4 sm:first:pl-0 sm:even:pr-0"
                href={link.href}
                key={link.href}
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md border border-admin-border bg-admin-surface-subtle text-admin-text-secondary transition-colors group-hover:border-admin-border-strong group-hover:text-admin-accent">
                  <Box aria-hidden="true" size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-medium text-admin-text-primary">
                    {link.label}
                    <ArrowUpRight aria-hidden="true" size={13} />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-admin-text-muted">
                    {link.description}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </OverviewSection>
        <OverviewSection
          icon={<CheckCircle2 aria-hidden="true" size={16} />}
          title="Recent activity"
          description="Latest visible audit events."
        >
          {dashboard.states.audit.status === "unavailable" ||
          dashboard.states.audit.status === "forbidden" ? (
            <FeedStateNotice label="Recent activity" state={dashboard.states.audit} />
          ) : dashboard.auditEvents.length ? (
            <ul className="divide-y divide-admin-border border-y border-admin-border">
              {dashboard.auditEvents.slice(0, 6).map((event) => (
                <li className="relative py-3 pl-6" key={event.id}>
                  <span className="absolute left-0 top-[18px] size-2 rounded-full bg-admin-accent" />
                  <p className="text-sm font-medium text-admin-text-primary">{event.action}</p>
                  <p className="mt-1 text-xs text-admin-text-muted">
                    {event.targetType} · {formatDate(event.occurredAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-y border-admin-border py-4 text-sm leading-5 text-admin-text-muted">
              No audit events have been recorded.
            </p>
          )}
        </OverviewSection>
      </section>
    </div>
  );
}

function OverviewSection({
  icon,
  title,
  description,
  meta,
  children,
}: Readonly<{
  icon?: ReactNode;
  title: string;
  description: string;
  meta?: string;
  children: ReactNode;
}>) {
  return (
    <section>
      <div className="mb-4 flex items-start gap-2">
        {icon ? <span className="mt-0.5 text-admin-text-secondary">{icon}</span> : null}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-base font-semibold text-admin-text-primary">{title}</h2>
            {meta ? (
              <span className="text-xs font-medium text-admin-text-muted">{meta}</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-admin-text-secondary">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function HealthStatus({
  label,
  tone,
}: Readonly<{ label: string; tone: "success" | "warning" | "neutral" }>) {
  const toneClass = {
    success: "bg-admin-success-soft text-admin-accent",
    warning: "bg-amber-50 text-amber-800",
    neutral: "bg-admin-surface-subtle text-admin-text-secondary",
  }[tone];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold ${toneClass}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </div>
  );
}

function MetricSummary({
  label,
  value,
  note,
  icon,
}: Readonly<{ label: string; value: string; note: string; icon: ReactNode }>) {
  return (
    <article className="min-w-0 py-4 sm:px-4 sm:first:pl-0 xl:py-5 xl:first:pl-0">
      <div className="flex items-center gap-2 text-xs font-medium text-admin-text-secondary">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 break-words text-[28px] font-semibold leading-8 tracking-[-0.03em] text-admin-text-primary">
        {value}
      </p>
      <p className="mt-1.5 truncate text-xs text-admin-text-muted" title={note}>
        {note}
      </p>
    </article>
  );
}

function MetricRow({ label, value }: Readonly<{ label: string; value: number | string }>) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 py-2">
      <dt className="text-sm text-admin-text-secondary">{label}</dt>
      <dd className="rounded-md bg-admin-surface-subtle px-2 py-0.5 text-xs font-semibold tabular-nums text-admin-text-primary">
        {value}
      </dd>
    </div>
  );
}

function countOpenCases(dashboard: AdminDashboardData): number | string {
  const state = dashboard.states.supportCases;
  return state.status === "ready" || state.status === "empty"
    ? dashboard.supportCases.filter((item) => item.status !== "resolved").length
    : "Unavailable";
}
function getHealth(dashboard: AdminDashboardData): {
  label: string;
  tone: "success" | "warning" | "neutral";
} {
  const states = Object.values(dashboard.states);
  if (states.some((state) => state.status === "unavailable"))
    return { label: "Some feeds unavailable", tone: "warning" };
  if (
    states.some((state) => state.status === "forbidden") ||
    dashboard.states.projection.status !== "ready"
  )
    return { label: "Limited access", tone: "neutral" };
  return { label: "Systems operational", tone: "success" };
}
function feedCount(state: AdminFeedState, count: number | undefined): number | string {
  return state.status === "ready" || state.status === "empty" ? (count ?? 0) : "Unavailable";
}
function feedStateNote(state: AdminFeedState): string {
  if (state.status === "forbidden") return "Permission required";
  if (state.status === "unavailable") return "Feed unavailable";
  if (state.status === "empty") return "No records";
  return "Not requested";
}
function feedStateLabel(state: AdminFeedState): string {
  if (state.status === "forbidden") return "Restricted";
  if (state.status === "unavailable") return "Unavailable";
  if (state.status === "empty") return "0 open";
  return "Not requested";
}
function FeedStateNotice({ label, state }: Readonly<{ label: string; state: AdminFeedState }>) {
  return (
    <p
      className="border-y border-admin-border py-4 text-sm leading-5 text-admin-text-muted"
      role={state.status === "unavailable" ? "alert" : undefined}
    >
      {label}{" "}
      {state.status === "forbidden"
        ? "requires additional permission."
        : state.status === "not_requested"
          ? "is not included for this role."
          : "could not be loaded."}
      {state.correlationId ? ` Reference ${state.correlationId}.` : ""}
    </p>
  );
}
function formatDate(value: string) {
  return new Date(value).toLocaleString("en-PH");
}
