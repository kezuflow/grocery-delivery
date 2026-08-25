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
    <section className="marketplace-orders grid gap-3" aria-label="Past orders">
      {orders.map((order) => (
        <article
          className="rounded-[var(--marketplace-radius-card)] border border-[var(--marketplace-border)] bg-[var(--marketplace-surface)] p-4 sm:p-5"
          key={order.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.12em] text-[var(--marketplace-accent-strong)]">
                {formatCycle(order.cycleId)}
              </p>
              <h2 className="mt-1 font-bold tracking-[-0.02em]">Order {order.id}</h2>
            </div>
            <StatusPill status={order.status === "canceled" ? order.status : order.paymentState} />
          </div>
          <div className="mt-4 grid gap-3 border-t border-[var(--marketplace-border)] pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-xs text-muted">Total due</p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatPhp(order.totals.totalDue.centavos)}
              </p>
            </div>
            <div className="grid gap-2 justify-items-start sm:justify-items-end">
              <a
                className="font-bold text-deep underline-offset-4 hover:underline"
                href={`/account/orders/${encodeURIComponent(order.id)}`}
              >
                View order
              </a>
              <ReorderButton lines={order.lines} />
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function formatCycle(cycleId: string) {
  return cycleId.startsWith("cycle-") ? `Delivery ${cycleId.slice(6)}` : cycleId;
}
