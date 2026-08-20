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

export type IdentityEmail = Readonly<{
  idempotencyKey: string;
  recipient: string;
  type: "email_verification" | "password_reset";
  actionUrl: string;
}>;

export interface IdentityEmailSender {
  send(message: IdentityEmail): Promise<void>;
}

/** Deterministic adapter for local development and tests. */
export class InMemoryIdentityEmailSender implements IdentityEmailSender {
  readonly messages: IdentityEmail[] = [];

  send(message: IdentityEmail): Promise<void> {
    if (!this.messages.some((item) => item.idempotencyKey === message.idempotencyKey)) {
      this.messages.push(Object.freeze({ ...message }));
    }
    return Promise.resolve();
  }
}
