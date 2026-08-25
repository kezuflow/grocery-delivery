import type { AdminOrdersData } from "../../lib/admin-product";
import type { AdminFeedState } from "../../lib/admin";

import {
  AdminPanel,
  AdminPanelHeader,
  AdminEmptyState,
  AdminStatus,
  ErrorState,
  LinkButton,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
} from "../../components/ui";

export function AdminOrders({ data }: Readonly<{ data: AdminOrdersData }>) {
  const assignments = data.dispatch?.assignments ?? [];
  const manifests = data.procurement?.manifests ?? [];
  const requests = data.orderRequests;
  return (
    <div className="grid gap-6">
      <section
        className="grid divide-y divide-admin-border border-y border-admin-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4"
        aria-label="Order operations summary"
      >
        <Metric
          label="Orders in dispatch"
          value={feedCount(data.states.dispatch, assignments.length)}
        />
        <Metric
          label="Packing manifests"
          value={feedCount(data.states.procurement, manifests.length)}
        />
        <Metric
          label="Customer requests"
          value={feedCount(data.states.orderRequests, requests.length)}
        />
        <Metric
          label="Failed deliveries"
          value={
            data.states.projection.status === "ready" || data.states.projection.status === "empty"
              ? String(data.projection?.delivery.failed ?? 0)
              : "Unavailable"
          }
        />
      </section>
      {data.error && Object.values(data.states).some((state) => state.status === "unavailable") ? (
        <p className="border border-danger/40 bg-danger/10 p-4 text-sm text-danger" role="alert">
          {data.error}
        </p>
      ) : null}
      <AdminPanel>
        <AdminPanelHeader
          description="Server-owned dispatch and packing statuses for the active cycle."
          title="Order fulfillment queue"
        />
        {data.states.dispatch.status === "unavailable" ||
        data.states.dispatch.status === "forbidden" ? (
          <FeedError label="Dispatch assignments" state={data.states.dispatch} />
        ) : assignments.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell>Order</TableHeaderCell>
                <TableHeaderCell>Window</TableHeaderCell>
                <TableHeaderCell>Delivery staff</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Next action</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <TableCell className="font-bold">{assignment.orderId}</TableCell>
                  <TableCell>{assignment.windowId}</TableCell>
                  <TableCell>{assignment.deliverymanUserId}</TableCell>
                  <TableCell>
                    <AdminStatus status={assignment.status} />
                  </TableCell>
                  <TableCell>
                    <LinkButton
                      className="rounded-md border-admin-border-strong text-admin-text-primary hover:bg-admin-surface-hover"
                      href="/admin/dispatch"
                      size="sm"
                      tone="secondary"
                    >
                      Open dispatch
                    </LinkButton>
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        ) : (
          <AdminEmptyState
            description="Dispatch assignments will appear after orders are scheduled."
            title="No active assignments"
          />
        )}
      </AdminPanel>
      <AdminPanel>
        <AdminPanelHeader
          description="Cancellation and refund requests requiring the matching support or finance workflow."
          title="Customer order requests"
        />
        {data.states.orderRequests.status === "unavailable" ||
        data.states.orderRequests.status === "forbidden" ? (
          <FeedError label="Customer requests" state={data.states.orderRequests} />
        ) : requests.length ? (
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell>Request</TableHeaderCell>
                <TableHeaderCell>Order</TableHeaderCell>
                <TableHeaderCell>Kind</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Workflow</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <TableCell className="font-bold">{request.id}</TableCell>
                  <TableCell>{request.orderId}</TableCell>
                  <TableCell className="capitalize">{request.kind}</TableCell>
                  <TableCell>
                    <AdminStatus status={request.status} />
                  </TableCell>
                  <TableCell>
                    <LinkButton
                      className="rounded-md border-admin-border-strong text-admin-text-primary hover:bg-admin-surface-hover"
                      href="/admin/support"
                      size="sm"
                      tone="secondary"
                    >
                      Review request
                    </LinkButton>
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        ) : (
          <AdminEmptyState
            description="There are no pending cancellation or refund requests."
            title="Request queue is clear"
          />
        )}
      </AdminPanel>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: number | string }>) {
  return (
    <div className="min-w-0 py-4 sm:px-4 sm:first:pl-0 xl:py-5">
      <p className="text-xs font-medium text-admin-text-secondary">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-8 tracking-[-0.03em] text-admin-text-primary">
        {value}
      </p>
    </div>
  );
}

function feedCount(state: AdminFeedState, count: number): number | string {
  return state.status === "ready" || state.status === "empty" ? count : "Unavailable";
}

function FeedError({ label, state }: Readonly<{ label: string; state: AdminFeedState }>) {
  return state.status === "forbidden" ? (
    <AdminEmptyState
      description="Your role does not include this feed."
      title={`${label} access restricted`}
    />
  ) : (
    <ErrorState
      description={state.correlationId ? `Reference ${state.correlationId}.` : "Try again shortly."}
      title={`${label} unavailable`}
    />
  );
}
