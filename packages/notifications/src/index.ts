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

export type NotificationDeliveryReceipt = Readonly<{
  idempotencyKey: string;
  eventType: string;
  aggregateId: string;
  correlationId: string;
  providerReference: string | null;
  acceptedAt: string;
}>;

export interface NotificationTransport {
  send(event: NotificationEvent): Promise<NotificationDeliveryReceipt>;
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

  async send(event: NotificationEvent): Promise<NotificationDeliveryReceipt> {
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
    return {
      idempotencyKey: event.idempotencyKey,
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      correlationId: event.correlationId,
      providerReference: response.headers.get("x-delivery-receipt"),
      acceptedAt: new Date().toISOString(),
    };
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

export type EmailServiceBinding = Readonly<{
  send(
    message: Readonly<{
      to: string;
      from: string;
      subject: string;
      text: string;
      html: string;
    }>,
  ): Promise<Readonly<{ messageId: string }>>;
}>;

/** Identity email sender backed by the Cloudflare Email Service Worker binding. */
export class CloudflareIdentityEmailSender implements IdentityEmailSender {
  constructor(
    private readonly binding: EmailServiceBinding,
    private readonly from: string,
  ) {}

  async send(message: IdentityEmail): Promise<void> {
    const subject =
      message.type === "email_verification"
        ? "Verify your Carbon Food Delivery email"
        : "Reset your Carbon Food Delivery password";
    const action =
      message.type === "email_verification" ? "verify your email address" : "reset your password";
    const safeUrl = escapeHtml(message.actionUrl);
    await this.binding.send({
      to: message.recipient,
      from: this.from,
      subject,
      text: `Use this link to ${action}: ${message.actionUrl}`,
      html: `<p>Use this link to ${action}:</p><p><a href="${safeUrl}">${safeUrl}</a></p>`,
    });
  }
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}
