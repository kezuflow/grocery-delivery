import type { EventProcessor, OutboxProcessingMessage } from "@carbon/application";
import type { PaymentReconciliationService } from "@carbon/billing";
import {
  createDeliveryMediaRetentionHandler,
  type DeliveryMediaObjectStore,
} from "@carbon/storage";
import type {
  DeliveryMediaRepository,
  NotificationDeliveryReceiptRepository,
  NotificationPreferencesRepository,
} from "@carbon/db";
import type { NotificationTransport } from "@carbon/notifications";

export function createEventProcessorHandlers(
  input: Readonly<{
    notificationTransport?: NotificationTransport;
    notificationPreferences?: NotificationPreferencesRepository;
    notificationReceipts?: NotificationDeliveryReceiptRepository;
    paymentReconciliation?: PaymentReconciliationService;
    retention?: () => Promise<unknown>;
  }>,
): EventProcessor | undefined {
  if (!input.notificationTransport && !input.paymentReconciliation && !input.retention) {
    return undefined;
  }
  return async (kind, message) => {
    if (kind === "notification") {
      if (!input.notificationTransport) throw new Error("notification transport is unavailable");
      const notification = notificationPayload(message);
      if (input.notificationPreferences) {
        const preferences = await input.notificationPreferences.get(notification.customerId);
        if (preferences && !preferences.deliveryUpdates) return;
      }
      const receipt = await input.notificationTransport.send({
        idempotencyKey: `outbox:${message.outboxEventId}`,
        eventType: message.eventType,
        aggregateId: message.aggregateId,
        payloadJson: notification.payloadJson,
        correlationId: message.correlationId,
      });
      await input.notificationReceipts?.save(receipt);
      return;
    }
    if (kind === "payment") {
      if (!input.paymentReconciliation) throw new Error("payment reconciliation is unavailable");
      await input.paymentReconciliation.run(parseReconciliationMessage(message));
      return;
    }
    if (!input.retention) throw new Error("media retention is unavailable");
    await input.retention();
  };
}

function notificationPayload(message: OutboxProcessingMessage): {
  customerId: string;
  payloadJson: string;
} {
  let payload: unknown;
  try {
    payload = JSON.parse(message.payloadJson);
  } catch {
    throw new Error("notification event payload is invalid JSON");
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("notification event payload is invalid");
  }
  const value = payload as Record<string, unknown>;
  if (message.eventType === "order.locked") {
    const customerId = boundedText(value.customerId, 256);
    const orderId = boundedText(value.id, 256) ?? message.aggregateId;
    const cycleId = boundedText(value.cycleId, 256);
    const lockedAt = boundedIso(value.lockedAt);
    if (!customerId || !orderId || !cycleId || !lockedAt) {
      throw new Error("order notification payload is invalid");
    }
    return { customerId, payloadJson: JSON.stringify({ customerId, orderId, cycleId, lockedAt }) };
  }
  if (message.eventType.startsWith("delivery.")) {
    const customerId = boundedText(value.customerId, 256);
    const orderId = boundedText(value.orderId, 256) ?? message.aggregateId;
    const occurredAt = boundedIso(value.occurredAt) ?? message.occurredAt;
    if (!customerId || !orderId) throw new Error("delivery notification payload is invalid");
    return { customerId, payloadJson: JSON.stringify({ customerId, orderId, occurredAt }) };
  }
  throw new Error(`unsupported notification event type: ${message.eventType}`);
}

export function createMediaRetentionHandler(
  input: Readonly<{
    repository: DeliveryMediaRepository;
    objectStore: DeliveryMediaObjectStore;
    retentionDays: number;
    now?: () => Date;
  }>,
) {
  return createDeliveryMediaRetentionHandler(input.repository, input.objectStore, {
    retentionDays: input.retentionDays,
    ...(input.now ? { now: input.now } : {}),
  });
}

function parseReconciliationMessage(message: OutboxProcessingMessage) {
  if (message.eventType !== "payment.reconcile") {
    throw new Error(`unsupported payment event type: ${message.eventType}`);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(message.payloadJson);
  } catch {
    throw new Error("payment event payload is invalid JSON");
  }
  if (!payload || typeof payload !== "object") throw new Error("payment event payload is invalid");
  const value = payload as Record<string, unknown>;
  const from = boundedIso(value.from);
  const to = boundedIso(value.to);
  if (!from || !to || from > to) throw new Error("payment reconciliation range is invalid");
  return { from, to, now: message.occurredAt };
}

function boundedIso(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 64) return null;
  return !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value ? value : null;
}

function boundedText(value: unknown, maximumLength: number): string | null {
  return typeof value === "string" && value.trim() && value.length <= maximumLength ? value : null;
}
