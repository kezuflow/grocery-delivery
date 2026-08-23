import type { OrderListResponse } from "@carbon/contracts";

import { EmptyState, StatusPill } from "../../components/ui";
import { formatPhp } from "../../lib/format";
import { ReorderButton } from "./reorder-button";

export function CustomerOrderList({
  orders,
}: Readonly<{ orders: OrderListResponse["data"]["orders"] }>) {
  if (orders.length === 0) {
    return (
      <EmptyState
        description="Locked weekly orders will appear here with server-confirmed totals and payment states."
        title="No orders yet"
      />
    );
  }

  return (
    <div className="overflow-x-auto border border-line bg-white">
      <table className="w-full min-w-[42rem] text-left text-sm">
        <thead className="border-b border-line bg-paper text-xs uppercase tracking-[0.12em] text-muted">
          <tr>
            <th className="p-4">Order</th>
            <th className="p-4">Delivery cycle</th>
            <th className="p-4">Total</th>
            <th className="p-4">Status</th>
            <th className="p-4">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="p-4 font-bold">{order.id}</td>
              <td className="p-4 text-muted">{formatCycle(order.cycleId)}</td>
              <td className="p-4">{formatPhp(order.totals.totalDue.centavos)}</td>
              <td className="p-4">
                <StatusPill
                  status={order.status === "canceled" ? order.status : order.paymentState}
                />
              </td>
              <td className="p-4">
                <div className="grid gap-2 justify-items-start">
                  <a
                    className="font-bold text-deep underline-offset-4 hover:underline"
                    href={`/account/orders/${encodeURIComponent(order.id)}`}
                  >
                    View order
                  </a>
                  <ReorderButton lines={order.lines} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCycle(cycleId: string) {
  return cycleId.startsWith("cycle-") ? `Delivery ${cycleId.slice(6)}` : cycleId;
}
