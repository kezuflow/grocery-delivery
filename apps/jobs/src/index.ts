import type {
  PaymentReconciliationService,
  ReconciliationInput,
  ReconciliationReport,
} from "@carbon/billing";
import type { OutboxEventRecord, OutboxFailure, OutboxRepository } from "@carbon/db";

export type ReconciliationJobMessage = Readonly<{
  from: string;
  to: string;
}>;

export type ReconciliationRunner = Pick<PaymentReconciliationService, "run">;

export function createReconciliationJob(
  runner: ReconciliationRunner,
  now: () => Date = () => new Date(),
): (message: ReconciliationJobMessage) => Promise<ReconciliationReport> {
  return (message) => {
    const input: ReconciliationInput = {
      from: message.from,
      to: message.to,
      now: now().toISOString(),
    };
    return runner.run(input);
  };
}

export type OutboxJobMessage = Readonly<{
  outboxEventId: string;
  eventType: string;
  aggregateId: string;
  occurredAt: string;
  payloadJson: string;
  claimToken: string;
  correlationId: string;
}>;

export type OutboxQueue = Readonly<{
  send(message: OutboxJobMessage): Promise<void>;
}>;

export type OutboxDispatchResult = Readonly<{
  claimed: number;
  queued: number;
  failed: number;
}>;

export function createOutboxDispatcher(
  repository: OutboxRepository,
  queue: OutboxQueue,
  options: Readonly<{
    now?: () => Date;
    generateClaimToken?: () => string;
    correlationId?: string;
    limit?: number;
    leaseSeconds?: number;
    maxAttempts?: number;
    retryDelaySeconds?: number;
  }> = {},
): { dispatch(): Promise<OutboxDispatchResult> } {
  const now = options.now ?? (() => new Date());
  const generateClaimToken = options.generateClaimToken ?? (() => crypto.randomUUID());
  const correlationId = options.correlationId ?? "outbox-dispatch";
  const limit = options.limit ?? 25;
  const leaseSeconds = options.leaseSeconds ?? 300;
  const maxAttempts = options.maxAttempts ?? 5;
  const retryDelaySeconds = options.retryDelaySeconds ?? 30;

  return {
    async dispatch() {
      const dispatchTime = now();
      const claimToken = generateClaimToken();
      const events = await repository.claimPending({
        now: dispatchTime.toISOString(),
        limit,
        leaseSeconds,
        claimToken,
      });
      let queued = 0;
      let failed = 0;
      for (const event of events) {
        try {
          await queue.send(toJobMessage(event, correlationId));
          queued += 1;
        } catch (error) {
          failed += 1;
          await repository.markFailed(
            event.id,
            claimToken,
            failureFor(error, dispatchTime, maxAttempts, retryDelaySeconds),
          );
        }
      }
      return { claimed: events.length, queued, failed };
    },
  };
}

export type OutboxJobProcessor = (message: OutboxJobMessage) => Promise<void>;

export type OutboxQueueMessage = Readonly<{
  body: OutboxJobMessage;
  attempts: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}>;

export type OutboxQueueBatch = Readonly<{
  messages: readonly OutboxQueueMessage[];
}>;

export function createOutboxQueueHandler(
  repository: OutboxRepository,
  processor: OutboxJobProcessor,
  options: Readonly<{
    now?: () => Date;
    maxAttempts?: number;
    retryDelaySeconds?: number;
    maxRetryDelaySeconds?: number;
  }> = {},
): (batch: OutboxQueueBatch) => Promise<void> {
  const now = options.now ?? (() => new Date());
  const maxAttempts = options.maxAttempts ?? 5;
  const retryDelaySeconds = options.retryDelaySeconds ?? 30;
  const maxRetryDelaySeconds = options.maxRetryDelaySeconds ?? 15 * 60;

  return async (batch) => {
    for (const message of batch.messages) {
      try {
        if (
          !(await repository.isClaimActive(message.body.outboxEventId, message.body.claimToken))
        ) {
          message.ack();
          continue;
        }
        await processor(message.body);
        await repository.markPublished(
          message.body.outboxEventId,
          message.body.claimToken,
          now().toISOString(),
        );
        message.ack();
      } catch (error) {
        const outcome = await repository.markFailed(
          message.body.outboxEventId,
          message.body.claimToken,
          failureFor(error, now(), maxAttempts, retryDelaySeconds),
        );
        if (outcome === "retry") {
          message.retry({
            delaySeconds: retryDelay(message.attempts, retryDelaySeconds, maxRetryDelaySeconds),
          });
        } else {
          message.ack();
        }
      }
    }
  };
}

function toJobMessage(event: OutboxEventRecord, correlationId: string): OutboxJobMessage {
  if (!event.claimToken) throw new Error(`outbox event ${event.id} has no claim token`);
  return {
    outboxEventId: event.id,
    eventType: event.eventType,
    aggregateId: event.aggregateId,
    occurredAt: event.occurredAt,
    payloadJson: event.payloadJson,
    claimToken: event.claimToken,
    correlationId,
  };
}

function failureFor(
  error: unknown,
  now: Date,
  maxAttempts: number,
  retryDelaySeconds: number,
): OutboxFailure {
  return {
    now: now.toISOString(),
    error: error instanceof Error ? error.message : "outbox job failed",
    maxAttempts,
    retryDelaySeconds,
  };
}

function retryDelay(attempts: number, baseSeconds: number, maxSeconds: number): number {
  return Math.min(maxSeconds, baseSeconds * 2 ** Math.max(0, attempts - 1));
}
