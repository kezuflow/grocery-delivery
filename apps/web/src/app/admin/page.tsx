import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { loadAdminDashboard } from "../../lib/admin";
import { loadCurrentSession } from "../../lib/session";
import { AuthControls } from "../auth-controls";
import { AdminActions } from "./admin-actions";
import { LaunchConfigurationForm } from "./launch-configuration-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Operations" };

export default async function AdminPage() {
  const auth = await loadCurrentSession();
  if (!auth.session || auth.session.role !== "admin") redirect("/");
  const dashboard = await loadAdminDashboard(auth.session.adminPermissions);
  return (
    <main className="account-page min-h-screen bg-paper text-ink">
      <header className="site-header account-header">
        <a className="wordmark" href="/" aria-label="Carbon Food Delivery home">
          <span className="wordmark-mark">C</span>
          <span>Carbon</span>
        </a>
        <nav aria-label="Operations navigation">
          <a href="/">Storefront</a>
          <AuthControls signedIn />
        </nav>
      </header>
      <section className="account-intro">
        <div>
          <p className="eyebrow">Operations console</p>
          <h1>Weekly operations</h1>
        </div>
        <span className="account-status">
          {auth.session.adminPermissions.join(", ") || "admin"}
        </span>
      </section>
      {dashboard.error ? (
        <section className="account-state" role="status">
          <h2>Dashboard unavailable</h2>
          <p>{dashboard.error}</p>
        </section>
      ) : (
        <section className="account-grid" aria-label="Operations dashboard">
          <MetricPanel title="Cycle" value={dashboard.projection?.cycleId ?? "Unavailable"} />
          <MetricPanel
            title="Pending outbox"
            value={String(dashboard.projection?.outbox.pendingCount ?? 0)}
          />
          <MetricPanel
            title="Open shortages"
            value={String(dashboard.projection?.procurement.openShortages ?? 0)}
          />
          <MetricPanel
            title="Assignments"
            value={String(dashboard.projection?.delivery.totalAssignments ?? 0)}
          />
          {auth.session.adminPermissions.includes("reporting") ? (
            <section className="account-panel account-panel-wide">
              <div className="account-panel-heading">
                <p className="eyebrow">Operational alerts</p>
                <span>{dashboard.projection?.alerts.length ?? 0} active</span>
              </div>
              {dashboard.projection?.alerts.length ? (
                <ul className="account-history operational-alerts">
                  {dashboard.projection.alerts.map((alert) => (
                    <li key={alert.id}>
                      <span>{alert.message}</span>
                      <strong data-severity={alert.severity}>{alert.severity}</strong>
                      <small>
                        Observed {alert.observedValue}; alert threshold {alert.threshold}
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="subscription-note">No operational alerts are active.</p>
              )}
            </section>
          ) : null}
          <section className="account-panel account-panel-wide">
            <div className="account-panel-heading">
              <p className="eyebrow">Packing</p>
              <span>{dashboard.procurement?.manifests.length ?? 0} manifests</span>
            </div>
            {dashboard.procurement?.manifests.length ? (
              <ul className="account-history">
                {dashboard.procurement.manifests.map((manifest) => (
                  <li key={manifest.id}>
                    <span>{manifest.orderId}</span>
                    <strong>{manifest.status}</strong>
                    <small>{manifest.cycleId}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="subscription-note">No packing manifests for this cycle.</p>
            )}
          </section>
          <section className="account-panel account-panel-wide">
            <div className="account-panel-heading">
              <p className="eyebrow">Campaigns</p>
              <span>{dashboard.promotions.length} records</span>
            </div>
            {dashboard.promotions.length ? (
              <ul className="account-history">
                {dashboard.promotions.map((promotion) => (
                  <li key={promotion.id}>
                    <span>{promotion.code ?? promotion.id}</span>
                    <strong>{promotion.status}</strong>
                    <small>{promotion.redemptionCount} redemptions</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="subscription-note">No campaigns have been created.</p>
            )}
          </section>
          <AdminActions
            permissions={auth.session.adminPermissions}
            procurement={dashboard.procurement}
            promotions={dashboard.promotions}
            supportCases={dashboard.supportCases}
            orderRequests={dashboard.orderRequests}
          />
          {auth.session.adminPermissions.includes("superadmin") ? (
            <LaunchConfigurationForm />
          ) : null}
          {auth.session.adminPermissions.includes("reporting") ? (
            <section className="account-panel account-panel-wide">
              <div className="account-panel-heading">
                <p className="eyebrow">Audit history</p>
                <span>{dashboard.auditEvents.length} events</span>
              </div>
              {dashboard.auditEvents.length ? (
                <ul className="account-history">
                  {dashboard.auditEvents.map((event) => (
                    <li key={event.id}>
                      <span>{event.action}</span>
                      <strong>{event.targetType}</strong>
                      <small>{new Date(event.occurredAt).toLocaleString("en-PH")}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="subscription-note">No audit events are available.</p>
              )}
            </section>
          ) : null}
        </section>
      )}
    </main>
  );
}

function MetricPanel({ title, value }: Readonly<{ title: string; value: string }>) {
  return (
    <article className="account-panel">
      <p className="eyebrow">{title}</p>
      <h2>{value}</h2>
    </article>
  );
}
