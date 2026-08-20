export const EVENT_PROCESSOR_KINDS = ["notification", "payment", "retention"] as const;
export type EventProcessorKind = (typeof EVENT_PROCESSOR_KINDS)[number];

export type OutboxProcessingMessage = Readonly<{
  outboxEventId: string;
  eventType: string;
  aggregateId: string;
  occurredAt: string;
  payloadJson: string;
  claimToken: string;
  correlationId: string;
}>;

export type EventProcessor = (
  kind: EventProcessorKind,
  message: OutboxProcessingMessage,
) => Promise<void>;

export function resolveEventProcessorKind(eventType: string): EventProcessorKind {
  if (eventType === "order.locked" || eventType.startsWith("delivery.")) return "notification";
  if (eventType.startsWith("payment.")) return "payment";
  if (eventType.startsWith("retention.")) return "retention";
  throw new Error(`unsupported outbox event type: ${eventType}`);
}

export function parseOutboxProcessingMessage(value: unknown): OutboxProcessingMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  const outboxEventId = boundedText(message.outboxEventId, 256);
  const eventType = boundedText(message.eventType, 128);
  const aggregateId = boundedText(message.aggregateId, 256);
  const occurredAt = boundedText(message.occurredAt, 64);
  const payloadJson = boundedText(message.payloadJson, 1_000_000);
  const claimToken = boundedText(message.claimToken, 256);
  const correlationId = boundedText(message.correlationId, 256);
  if (
    !outboxEventId ||
    !eventType ||
    !aggregateId ||
    !occurredAt ||
    !payloadJson ||
    !claimToken ||
    !correlationId ||
    !isIsoTimestamp(occurredAt) ||
    !isJson(payloadJson)
  ) {
    return null;
  }
  return Object.freeze({
    outboxEventId,
    eventType,
    aggregateId,
    occurredAt,
    payloadJson,
    claimToken,
    correlationId,
  });
}

function boundedText(value: unknown, maximumLength: number): string | null {
  return typeof value === "string" && value.trim() && value.length <= maximumLength ? value : null;
}

function isIsoTimestamp(value: string): boolean {
  return !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value;
}

function isJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
