import type { OutboxJobMessage } from "./index.js";

export type EventProcessorKind = "notification" | "payment" | "retention";

export function resolveEventProcessorKind(eventType: string): EventProcessorKind {
  if (eventType === "order.locked" || eventType.startsWith("delivery.")) return "notification";
  if (eventType.startsWith("payment.")) return "payment";
  if (eventType.startsWith("retention.")) return "retention";
  throw new Error(`unsupported outbox event type: ${eventType}`);
}

export type EventProcessorHandler = (message: OutboxJobMessage) => Promise<void>;

export type EventProcessorHandlers = Readonly<Record<EventProcessorKind, EventProcessorHandler>>;

export function createEventProcessorRouter(
  handlers: EventProcessorHandlers,
): EventProcessorHandler {
  return (message) => handlers[resolveEventProcessorKind(message.eventType)](message);
}
