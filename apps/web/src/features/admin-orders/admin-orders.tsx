import type { AdminOrdersData } from "../../lib/admin-product";
import type { AdminFeedState } from "../../lib/admin";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  LinkButton,
  StatusPill,
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
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
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
      <Card>
        <CardHeader>
          <CardTitle>Order fulfillment queue</CardTitle>
          <CardDescription>
            Server-owned dispatch and packing statuses for the active cycle.
          </CardDescription>
        </CardHeader>
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
                    <StatusPill status={assignment.status} />
                  </TableCell>
                  <TableCell>
                    <LinkButton href="/admin/dispatch" size="sm" tone="secondary">
                      Open dispatch
                    </LinkButton>
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            description="Dispatch assignments will appear after orders are scheduled."
            title="No active assignments"
          />
        )}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Customer order requests</CardTitle>
          <CardDescription>
            Cancellation and refund requests requiring the matching support or finance workflow.
          </CardDescription>
        </CardHeader>
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
                    <StatusPill status={request.status} />
                  </TableCell>
                  <TableCell>
                    <LinkButton href="/admin/support" size="sm" tone="secondary">
                      Review request
                    </LinkButton>
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            description="There are no pending cancellation or refund requests."
            title="Request queue is clear"
          />
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: number | string }>) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </Card>
  );
}

function feedCount(state: AdminFeedState, count: number): number | string {
  return state.status === "ready" || state.status === "empty" ? count : "Unavailable";
}

function FeedError({ label, state }: Readonly<{ label: string; state: AdminFeedState }>) {
  return state.status === "forbidden" ? (
    <EmptyState
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
