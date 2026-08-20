import { describe, expect, it } from "vitest";
import { InMemoryOutboxRepository } from "@carbon/db";
import { createJobsWorker } from "./worker.js";

describe("jobs worker shell", () => {
  it("connects scheduled dispatch and queue processing to the framework adapters", async () => {
    const repository = new InMemoryOutboxRepository();
    const calls: string[] = [];
    const worker = createJobsWorker({
      createOutboxRepository: () => repository,
      processOutboxJob: (message) => {
        calls.push(message.outboxEventId);
        return Promise.resolve();
      },
      queue: { send: () => Promise.resolve() },
    });
    await worker.scheduled();
    await worker.queue({ messages: [] });
    expect(calls).toEqual([]);
  });
});
