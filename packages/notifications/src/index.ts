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

export type NotificationEvent = Readonly<{
  idempotencyKey: string;
  eventType: string;
  aggregateId: string;
  payloadJson: string;
  correlationId: string;
}>;

export interface NotificationTransport {
  send(event: NotificationEvent): Promise<void>;
}

/** Provider-neutral HTTP notification transport with retry-stable idempotency headers. */
export class HttpNotificationTransport implements NotificationTransport {
  constructor(
    private readonly endpoint: string,
    private readonly options: Readonly<{
      token?: string;
      fetch?: typeof fetch;
    }> = {},
  ) {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" && !isLocalEndpoint(url)) {
      throw new Error("notification endpoint must use HTTPS outside local development");
    }
  }

  async send(event: NotificationEvent): Promise<void> {
    const headers = new Headers({
      "content-type": "application/json",
      "idempotency-key": event.idempotencyKey,
      "x-correlation-id": event.correlationId,
    });
    if (this.options.token) headers.set("authorization", `Bearer ${this.options.token}`);
    const response = await (this.options.fetch ?? fetch)(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(event),
    });
    if (!response.ok)
      throw new Error(`notification provider failed with status ${response.status}`);
  }
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

function isLocalEndpoint(url: URL): boolean {
  return url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
}
