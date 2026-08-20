import { D1OutboxRepository, type CatalogDatabase } from "@carbon/db";
import { createJobsWorker, type OutboxJobMessage } from "./index.js";
import { resolveEventProcessorKind } from "./processors.js";

export type JobsBindings = Readonly<{
  DB: CatalogDatabase;
  OUTBOX_QUEUE: { send(message: OutboxJobMessage): Promise<void> };
  EVENT_PROCESSOR: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> };
}>;

export type JobsRuntimeOptions = Readonly<{
  sleep?: (milliseconds: number) => Promise<void>;
}>;

export function createEventProcessor(
  bindings: Pick<JobsBindings, "EVENT_PROCESSOR">,
  options: JobsRuntimeOptions = {},
) {
  const sleep =
    options.sleep ??
    ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  return async (message: OutboxJobMessage) => {
    const request = () =>
      bindings.EVENT_PROCESSOR.fetch("https://event-processor.internal/outbox", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-correlation-id": message.correlationId,
          "x-event-processor": resolveEventProcessorKind(message.eventType),
        },
        body: JSON.stringify(message),
      });
    let response = await request();
    if (response.status === 429) {
      await sleep(5_000);
      response = await request();
    }
    if (!response.ok) throw new Error(`event processor failed with status ${response.status}`);
  };
}

export function createConfiguredJobsWorker(
  bindings: JobsBindings,
  options: JobsRuntimeOptions = {},
) {
  return createJobsWorker({
    createOutboxRepository: () => new D1OutboxRepository(bindings.DB),
    queue: bindings.OUTBOX_QUEUE,
    processOutboxJob: createEventProcessor(bindings, options),
  });
}

export default {
  async scheduled(_controller: ScheduledController, bindings: JobsBindings) {
    await createConfiguredJobsWorker(bindings).scheduled();
  },
  async queue(batch: MessageBatch<OutboxJobMessage>, bindings: JobsBindings) {
    await createConfiguredJobsWorker(bindings).queue({
      messages: batch.messages.map((message) => ({
        body: message.body,
        attempts: message.attempts,
        ack: () => message.ack(),
        retry: (options) => message.retry(options),
      })),
    });
  },
} satisfies ExportedHandler<JobsBindings, OutboxJobMessage>;
