import type { OrderListResponse, PaymentHistoryResponse } from "@carbon/contracts";

type Props = Readonly<{
  orders: OrderListResponse["data"]["orders"];
  payments: PaymentHistoryResponse["data"]["entries"];
}>;

export function Receipts({ orders, payments }: Props) {
  const receipts = orders.map((order) => ({
    order,
    payments: payments.filter((payment) => payment.orderId === order.id),
  }));

  return (
    <article className="account-panel account-panel-wide">
      <div className="account-panel-heading">
        <p className="eyebrow">Receipts</p>
        <span>{receipts.length} orders</span>
      </div>
      {receipts.length === 0 ? (
        <p className="subscription-note">Receipts appear after an order is placed.</p>
      ) : (
        <ul className="account-history">
          {receipts.map(({ order, payments: orderPayments }) => (
            <li key={order.id}>
              <span>Order {order.id}</span>
              <strong>{formatPrice(order.totals.totalDue.centavos)}</strong>
              <small>
                {order.status === "canceled" ? "Canceled" : "Order placed"} ·{" "}
                {orderPayments.length
                  ? orderPayments.map((payment) => `${payment.kind} ${payment.status}`).join(", ")
                  : "No completed payment record"}
              </small>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function formatPrice(centavos: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}
