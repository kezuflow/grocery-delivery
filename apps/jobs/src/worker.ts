import type { OutboxRepository } from "@carbon/db";
import {
  createOutboxDispatcher,
  createOutboxQueueHandler,
  type OutboxJobMessage,
  type OutboxJobProcessor,
  type OutboxQueueBatch,
} from "./index.js";

export type JobsWorkerEnvironment = Readonly<{
  createOutboxRepository(): OutboxRepository;
  processOutboxJob: OutboxJobProcessor;
  queue: { send(message: OutboxJobMessage): Promise<void> };
}>;

export type JobsWorker = Readonly<{
  scheduled(): Promise<void>;
  queue(batch: OutboxQueueBatch): Promise<void>;
}>;

export function createJobsWorker(environment: JobsWorkerEnvironment): JobsWorker {
  return {
    async scheduled() {
      const repository = environment.createOutboxRepository();
      await createOutboxDispatcher(repository, environment.queue).dispatch();
    },
    async queue(batch) {
      const repository = environment.createOutboxRepository();
      await createOutboxQueueHandler(repository, environment.processOutboxJob)(batch);
    },
  };
}
