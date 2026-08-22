import type { AdminOrdersData } from "../../lib/admin-product";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
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
        <Metric label="Orders in dispatch" value={assignments.length} />
        <Metric label="Packing manifests" value={manifests.length} />
        <Metric label="Customer requests" value={requests.length} />
        <Metric
          label="Failed deliveries"
          value={String(
            data.projection?.delivery.failed ??
              assignments.filter((item) => item.status === "failed").length,
          )}
        />
      </section>
      {data.error ? (
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
        {assignments.length ? (
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
        {requests.length ? (
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
