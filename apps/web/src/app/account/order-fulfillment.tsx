import type { CustomerOrderFulfillment } from "../../lib/account";

type OrderFulfillmentProps = Readonly<{
  fulfillment: readonly CustomerOrderFulfillment[];
}>;

const statusLabels: Record<string, string> = {
  pending: "Preparing",
  assigned: "Driver assigned",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  failed: "Delivery issue",
};

export function OrderFulfillment({ fulfillment }: OrderFulfillmentProps) {
  if (fulfillment.length === 0) return null;

  return (
    <article className="account-panel account-panel-wide">
      <div className="account-panel-heading">
        <p className="eyebrow">Delivery updates</p>
        <span>{fulfillment.length} orders</span>
      </div>
      <ul className="account-history">
        {fulfillment.map((item) => (
          <li key={item.orderId}>
            <span>{item.orderId}</span>
            <strong>
              {item.tracking
                ? (statusLabels[item.tracking.status] ?? item.tracking.status)
                : "Not dispatched"}
            </strong>
            <small>
              {item.tracking?.latestEventType
                ? `Latest update: ${item.tracking.latestEventType.replace("_", " ")}`
                : "No delivery events yet"}
              {item.media.length > 0 ? ` · ${item.media.length} proof photo(s)` : ""}
            </small>
            {item.media.length > 0 ? (
              <div>
                {item.media.map((media) => (
                  <a key={media.id} href={media.downloadUrl} target="_blank" rel="noreferrer">
                    View proof of delivery
                  </a>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  );
}
