import type { OutboxJobMessage } from "./index.js";
import { resolveEventProcessorKind, type EventProcessorKind } from "@carbon/application";

export { resolveEventProcessorKind, type EventProcessorKind };

export type EventProcessorHandler = (message: OutboxJobMessage) => Promise<void>;

export type EventProcessorHandlers = Readonly<Record<EventProcessorKind, EventProcessorHandler>>;

export function createEventProcessorRouter(
  handlers: EventProcessorHandlers,
): EventProcessorHandler {
  return (message) => handlers[resolveEventProcessorKind(message.eventType)](message);
}
