import type { CustomerOrderDetail } from "../../lib/orders";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  LinkButton,
  StatusPill,
} from "../../components/ui";
import { formatPhp } from "../../lib/format";
import { OrderPaymentAction } from "./order-payment-action";

const trackingLabels: Record<string, string> = {
  pending: "Preparing",
  assigned: "Driver assigned",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  failed: "Delivery issue",
};

export function CustomerOrderDetailView({
  customerId,
  detail,
}: Readonly<{ customerId: string; detail: CustomerOrderDetail }>) {
  const { order, tracking, media } = detail;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Order {order.id}</CardTitle>
            <CardDescription>
              Locked {new Date(order.lockedAt).toLocaleString("en-PH")}
            </CardDescription>
          </CardHeader>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailRow label="Cycle" value={order.cycleId} />
            <DetailRow label="Payment" value={order.paymentState} />
            <DetailRow label="Status" value={order.status} />
            <DetailRow
              label="Delivery window"
              value={order.deliveryWindow?.label ?? "Not selected"}
            />
          </dl>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Delivery timeline</CardTitle>
            <CardDescription>
              {tracking ? (trackingLabels[tracking.status] ?? tracking.status) : "Not dispatched"}
            </CardDescription>
          </CardHeader>
          {tracking?.events.length ? (
            <ol className="grid gap-4 border-l border-line pl-5">
              {tracking.events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full bg-deep" />
                  <strong className="capitalize">{event.type.replaceAll("_", " ")}</strong>
                  <p className="mt-1 text-sm text-muted">
                    {new Date(event.occurredAt).toLocaleString("en-PH")}
                  </p>
                  {event.note ? <p className="mt-1 text-sm">{event.note}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No delivery events have been recorded yet.</p>
          )}
        </Card>
      </div>
      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle>Receipt</CardTitle>
          <CardDescription>Server-confirmed order totals</CardDescription>
        </CardHeader>
        <dl className="grid gap-3 text-sm">
          <DetailRow label="Subtotal" value={formatPhp(order.totals.subtotal.centavos)} />
          <DetailRow label="Discount" value={formatPhp(order.totals.discount.centavos)} />
          <DetailRow label="Delivery fee" value={formatPhp(order.totals.deliveryFee.centavos)} />
          <DetailRow label="Weekly fee" value={formatPhp(order.totals.weeklyFee.centavos)} />
          <DetailRow
            label="Included credit"
            value={formatPhp(order.totals.includedCredit.centavos)}
          />
          <div className="flex justify-between border-t border-line pt-3 font-bold">
            <dt>Total due</dt>
            <dd>{formatPhp(order.totals.totalDue.centavos)}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <StatusPill status={order.paymentState} />
        </div>
        <div className="mt-5 border-t border-line pt-5">
          <OrderPaymentAction
            customerId={customerId}
            methods={detail.paymentMethods}
            orderId={order.id}
            paymentState={order.paymentState}
          />
        </div>
        {media.length ? (
          <div className="mt-5 grid gap-2">
            <h3 className="font-bold">Proof of delivery</h3>
            {media.map((item) => (
              <a
                className="text-sm font-bold text-deep underline-offset-4 hover:underline"
                href={item.downloadUrl}
                key={item.id}
                rel="noreferrer"
                target="_blank"
              >
                View proof photo
              </a>
            ))}
          </div>
        ) : null}
        <LinkButton className="mt-5 w-full" href="/account/support" size="sm" tone="secondary">
          Need help?
        </LinkButton>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
