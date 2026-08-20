import type { OutboxRepository, OutboxScheduledEvent } from "@carbon/db";

export function createOperationalEventScheduler(
  now: () => Date = () => new Date(),
): (repository: OutboxRepository) => Promise<void> {
  return async (repository) => {
    if (!repository.schedule) throw new Error("outbox repository does not support scheduling");
    const current = now();
    const day = previousUtcDay(current);
    const events = [paymentReconciliationEvent(day, current), retentionEvent(day, current)];
    for (const event of events) await repository.schedule(event);
  };
}

function paymentReconciliationEvent(day: string, now: Date): OutboxScheduledEvent {
  return {
    id: `payment-reconcile:${day}`,
    eventType: "payment.reconcile",
    aggregateId: day,
    occurredAt: now.toISOString(),
    payloadJson: JSON.stringify({
      from: `${day}T00:00:00.000Z`,
      to: `${day}T23:59:59.999Z`,
    }),
  };
}

function retentionEvent(day: string, now: Date): OutboxScheduledEvent {
  return {
    id: `retention-expire-media:${day}`,
    eventType: "retention.expire-media",
    aggregateId: day,
    occurredAt: now.toISOString(),
    payloadJson: "{}",
  };
}

function previousUtcDay(now: Date): string {
  const value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  return value.toISOString().slice(0, 10);
}
