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

import { EmptyState, StatusPill } from "../../components/ui";
import type { AdminDashboardData, AdminFeedState } from "../../lib/admin";
import type { AdminPermission } from "../../lib/permissions";
import { visibleAdminWorkspaceLinks } from "./workspace-links";

export function AdminOverview({
  dashboard,
  permissions,
}: Readonly<{ dashboard: AdminDashboardData; permissions: readonly AdminPermission[] }>) {
  const projection = dashboard.projection;
  const projectionState = dashboard.states.projection;
  const projectionData = projectionState.status === "ready" ? projection : null;
  const links = visibleAdminWorkspaceLinks(permissions);
  const openCases =
    dashboard.states.supportCases.status === "ready" ||
    dashboard.states.supportCases.status === "empty"
      ? dashboard.supportCases.filter((item) => item.status !== "resolved").length
      : "Unavailable";
  const hasUnavailableFeed = Object.values(dashboard.states).some(
    (state) => state.status === "unavailable",
  );
  const hasForbiddenFeed = Object.values(dashboard.states).some(
    (state) => state.status === "forbidden",
  );
  const healthLabel = hasUnavailableFeed
    ? "Some feeds unavailable"
    : hasForbiddenFeed || projectionState.status !== "ready"
      ? "Limited access"
      : "Systems operational";
  const healthTone = hasUnavailableFeed
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : hasForbiddenFeed || projectionState.status !== "ready"
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className="grid gap-5">
      <section
        aria-labelledby="health-heading"
        className="overflow-hidden rounded-md border border-[#dedede] bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e4e4] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#222]" id="health-heading">
              Operations health
            </h2>
            <p className="mt-0.5 text-xs text-[#777]">
              Live signals for the active delivery cycle.
            </p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${healthTone}`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {healthLabel}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<Clock3 aria-hidden="true" size={14} strokeWidth={1.8} />}
            label="Active cycle"
            note={
              projectionData
                ? `Updated ${new Date(projectionData.generatedAt).toLocaleString("en-PH")}`
                : feedStateNote(projectionState)
            }
            value={projectionData?.cycleId ?? "Unavailable"}
          />
          <MetricCard
            icon={<Activity aria-hidden="true" size={14} strokeWidth={1.8} />}
            label="Pending outbox"
            note={
              projectionData
                ? `${projectionData.outbox.deadLetteredCount} dead-lettered`
                : feedStateNote(projectionState)
            }
            value={projectionData ? String(projectionData.outbox.pendingCount) : "Unavailable"}
          />
          <MetricCard
            icon={<PackageOpen aria-hidden="true" size={14} strokeWidth={1.8} />}
            label="Open shortages"
            note={
              projectionData
                ? `${projectionData.procurement.exceptionalManifests} packing exceptions`
                : feedStateNote(projectionState)
            }
            value={
              projectionData ? String(projectionData.procurement.openShortages) : "Unavailable"
            }
          />
          <MetricCard
            icon={<Truck aria-hidden="true" size={14} strokeWidth={1.8} />}
            label="Deliveries"
            note={
              projectionData
                ? `${projectionData.delivery.failed} failed`
                : feedStateNote(projectionState)
            }
            value={
              projectionData ? String(projectionData.delivery.totalAssignments) : "Unavailable"
            }
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
        <div className="overflow-hidden rounded-md border border-[#dedede] bg-white">
          <div className="flex items-center gap-2 border-b border-[#e4e4e4] px-4 py-3">
            <BellRing aria-hidden="true" className="text-[#666]" size={15} />
            <div>
              <h2 className="text-sm font-semibold text-[#222]">Operational alerts</h2>
              <p className="mt-0.5 text-xs text-[#777]">Prioritized server-generated warnings.</p>
            </div>
            <span className="ml-auto rounded bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-semibold text-[#666]">
              {projectionData
                ? `${projectionData.alerts.length} open`
                : feedStateLabel(projectionState)}
            </span>
          </div>
          {projectionState.status === "unavailable" || projectionState.status === "forbidden" ? (
            <FeedStateNotice label="Operational alerts" state={projectionState} />
          ) : projectionData?.alerts.length ? (
            <ul>
              {projectionData.alerts.map((alert) => (
                <li
                  className="flex flex-col gap-3 border-b border-[#ececec] px-4 py-3 last:border-0 sm:flex-row sm:items-center"
                  key={alert.id}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded bg-amber-50 text-amber-700">
                    <CircleAlert aria-hidden="true" size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#262626]">{alert.message}</p>
                    <p className="mt-0.5 text-[11px] text-[#777]">
                      Observed {alert.observedValue} · threshold {alert.threshold}
                    </p>
                  </div>
                  <StatusPill status={alert.severity} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4">
              <EmptyState
                description="No alert thresholds are currently exceeded."
                title="Operations are clear"
              />
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-md border border-[#dedede] bg-white">
          <div className="border-b border-[#e4e4e4] px-4 py-3">
            <h2 className="text-sm font-semibold text-[#222]">Cycle activity</h2>
            <p className="mt-0.5 text-xs text-[#777]">Current processing volume.</p>
          </div>
          <dl>
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
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <div className="overflow-hidden rounded-md border border-[#dedede] bg-white">
          <div className="flex items-center justify-between border-b border-[#e4e4e4] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[#222]">Workspaces</h2>
              <p className="mt-0.5 text-xs text-[#777]">Tools available to your role.</p>
            </div>
            <span className="text-[11px] text-[#888]">{links.length} available</span>
          </div>
          <div className="grid sm:grid-cols-2">
            {links.map((link) => (
              <a
                className="group flex min-h-[82px] items-start gap-3 border-b border-[#ececec] p-4 transition-colors hover:bg-[#fafafa] sm:odd:border-r"
                href={link.href}
                key={link.href}
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded border border-[#dfdfdf] bg-[#fafafa] text-[#666] group-hover:border-emerald-200 group-hover:text-emerald-700">
                  <Box aria-hidden="true" size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[13px] font-medium text-[#222]">
                    {link.label}
                    <ArrowUpRight aria-hidden="true" size={12} />
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-[#777]">
                    {link.description}
                  </span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-[#dedede] bg-white">
          <div className="flex items-center gap-2 border-b border-[#e4e4e4] px-4 py-3">
            <CheckCircle2 aria-hidden="true" className="text-emerald-600" size={15} />
            <div>
              <h2 className="text-sm font-semibold text-[#222]">Recent activity</h2>
              <p className="mt-0.5 text-xs text-[#777]">Latest visible audit events.</p>
            </div>
          </div>
          {dashboard.states.audit.status === "unavailable" ||
          dashboard.states.audit.status === "forbidden" ? (
            <FeedStateNotice label="Recent activity" state={dashboard.states.audit} />
          ) : dashboard.auditEvents.length ? (
            <ul>
              {dashboard.auditEvents.slice(0, 6).map((event) => (
                <li
                  className="relative border-b border-[#ececec] px-4 py-3 pl-9 last:border-0"
                  key={event.id}
                >
                  <span className="absolute left-4 top-[17px] size-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />
                  <p className="text-[13px] font-medium text-[#272727]">{event.action}</p>
                  <p className="mt-0.5 text-[11px] text-[#777]">
                    {event.targetType} · {new Date(event.occurredAt).toLocaleString("en-PH")}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-xs leading-5 text-[#777]">No audit events have been recorded.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon,
}: Readonly<{ label: string; value: string; note: string; icon: ReactNode }>) {
  return (
    <article className="min-w-0 border-b border-[#e4e4e4] p-4 sm:odd:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
      <div className="flex items-center gap-2 text-xs font-medium text-[#666]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 break-words text-2xl font-semibold tracking-[-0.03em] text-[#202020]">
        {value}
      </p>
      <p className="mt-1.5 truncate text-[11px] text-[#858585]" title={note}>
        {note}
      </p>
    </article>
  );
}

function MetricRow({ label, value }: Readonly<{ label: string; value: number | string }>) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-[#ececec] px-4 py-2 last:border-0">
      <dt className="text-xs text-[#666]">{label}</dt>
      <dd className="rounded bg-[#f1f1f1] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#333]">
        {value}
      </dd>
    </div>
  );
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
      className="p-4 text-xs leading-5 text-[#777]"
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
