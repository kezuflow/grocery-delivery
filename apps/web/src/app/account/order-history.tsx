import type { OrderListResponse } from "@carbon/contracts";

type OrderHistoryProps = Readonly<{
  orders: OrderListResponse["data"]["orders"];
}>;

function formatPrice(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

function formatCycle(cycleId: string) {
  return cycleId.startsWith("cycle-") ? `Delivery ${cycleId.slice(6)}` : cycleId;
}

function formatPaymentState(state: OrderListResponse["data"]["orders"][number]["paymentState"]) {
  const labels = {
    unpaid: "Payment not started",
    pending: "Payment processing",
    paid: "Paid",
    failed: "Payment failed",
  } as const;
  return labels[state];
}

export function OrderHistory({ orders }: OrderHistoryProps) {
  return (
    <article className="account-panel account-panel-wide">
      <div className="account-panel-heading">
        <p className="eyebrow">Order history</p>
        <span>{orders.length} orders</span>
      </div>
      {orders.length === 0 ? (
        <div className="account-empty">
          <h2>No orders yet</h2>
          <p>Your locked weekly orders will appear here with their server-confirmed totals.</p>
        </div>
      ) : (
        <ul className="account-history">
          {orders.map((order) => (
            <li key={order.id}>
              <span>{formatCycle(order.cycleId)}</span>
              <strong>{formatPrice(order.totals.totalDue.centavos)}</strong>
              <small>
                {order.status === "canceled" ? "Canceled" : formatPaymentState(order.paymentState)}{" "}
                · placed {new Date(order.lockedAt).toLocaleDateString("en-PH")}
              </small>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
