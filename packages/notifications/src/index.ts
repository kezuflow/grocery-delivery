export type DeliveryNotification = Readonly<{
  id: string;
  idempotencyKey: string;
  customerId: string;
  orderId: string;
  type: "delivery_update";
  eventType: "picked_up" | "arrived" | "delivered" | "failed";
  occurredAt: string;
}>;

export interface NotificationSender {
  send(notification: DeliveryNotification): Promise<void>;
}

export class InMemoryNotificationSender implements NotificationSender {
  readonly notifications: DeliveryNotification[] = [];

  send(notification: DeliveryNotification) {
    if (!this.notifications.some((item) => item.idempotencyKey === notification.idempotencyKey)) {
      this.notifications.push(Object.freeze({ ...notification }));
    }
    return Promise.resolve();
  }
}
