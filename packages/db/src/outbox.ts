import type { CatalogDatabase } from "./catalog.js";

export type OutboxEventRecord = Readonly<{
  id: string;
  eventType: string;
  aggregateId: string;
  occurredAt: string;
  payloadJson: string;
  attempts: number;
  publishedAt: string | null;
  claimedAt: string | null;
  claimToken: string | null;
  nextAttemptAt: string | null;
  lastError: string | null;
  deadLetteredAt: string | null;
}>;

export type OutboxFailure = Readonly<{
  now: string;
  error: string;
  maxAttempts: number;
  retryDelaySeconds: number;
}>;

export type OutboxFailureResult = "retry" | "dead_letter" | "ignored";

export interface OutboxRepository {
  schedule?(event: OutboxScheduledEvent): Promise<void>;
  claimPending(input: {
    now: string;
    limit: number;
    leaseSeconds: number;
    claimToken: string;
  }): Promise<readonly OutboxEventRecord[]>;
  isClaimActive(id: string, claimToken: string): Promise<boolean>;
  markPublished(id: string, claimToken: string, publishedAt: string): Promise<boolean>;
  markFailed(id: string, claimToken: string, failure: OutboxFailure): Promise<OutboxFailureResult>;
}

export type OutboxScheduledEvent = Readonly<{
  id: string;
  eventType: string;
  aggregateId: string;
  occurredAt: string;
  payloadJson: string;
}>;

export class InMemoryOutboxRepository implements OutboxRepository {
  private readonly events = new Map<string, OutboxEventRecord>();

  constructor(events: readonly OutboxEventRecord[] = []) {
    for (const event of events) this.events.set(event.id, Object.freeze({ ...event }));
  }

  schedule(event: OutboxScheduledEvent): Promise<void> {
    if (this.events.has(event.id)) return Promise.resolve();
    this.events.set(
      event.id,
      Object.freeze({
        ...event,
        attempts: 0,
        publishedAt: null,
        claimedAt: null,
        claimToken: null,
        nextAttemptAt: null,
        lastError: null,
        deadLetteredAt: null,
      }),
    );
    return Promise.resolve();
  }

  claimPending(input: { now: string; limit: number; leaseSeconds: number; claimToken: string }) {
    const leaseCutoff = addSeconds(input.now, -input.leaseSeconds);
    const candidates = [...this.events.values()]
      .filter(
        (event) =>
          event.publishedAt === null &&
          event.deadLetteredAt === null &&
          (event.nextAttemptAt === null || event.nextAttemptAt <= input.now) &&
          (event.claimedAt === null || event.claimedAt <= leaseCutoff),
      )
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
      .slice(0, input.limit);

    for (const event of candidates) {
      this.events.set(
        event.id,
        Object.freeze({
          ...event,
          claimedAt: input.now,
          claimToken: input.claimToken,
        }),
      );
    }
    return Promise.resolve(candidates.map((event) => this.events.get(event.id)!));
  }

  isClaimActive(id: string, claimToken: string) {
    const event = this.events.get(id);
    return Promise.resolve(
      event !== undefined && event.publishedAt === null && event.claimToken === claimToken,
    );
  }

  markPublished(id: string, claimToken: string, publishedAt: string) {
    const event = this.events.get(id);
    if (!event || event.publishedAt !== null || event.claimToken !== claimToken) {
      return Promise.resolve(false);
    }
    this.events.set(
      id,
      Object.freeze({ ...event, publishedAt, claimedAt: null, claimToken: null }),
    );
    return Promise.resolve(true);
  }

  markFailed(id: string, claimToken: string, failure: OutboxFailure): Promise<OutboxFailureResult> {
    const event = this.events.get(id);
    if (!event || event.publishedAt !== null || event.claimToken !== claimToken) {
      return Promise.resolve<OutboxFailureResult>("ignored");
    }
    const attempts = event.attempts + 1;
    const exhausted = attempts >= failure.maxAttempts;
    this.events.set(
      id,
      Object.freeze({
        ...event,
        attempts,
        lastError: failure.error,
        claimedAt: exhausted ? null : event.claimedAt,
        claimToken: exhausted ? null : event.claimToken,
        nextAttemptAt: exhausted ? null : addSeconds(failure.now, failure.retryDelaySeconds),
        deadLetteredAt: exhausted ? failure.now : null,
      }),
    );
    return Promise.resolve(exhausted ? "dead_letter" : "retry");
  }
}

export class D1OutboxRepository implements OutboxRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async schedule(event: OutboxScheduledEvent) {
    await this.database.batch([
      this.database
        .prepare(
          `INSERT OR IGNORE INTO outbox_events (
             id, event_type, aggregate_id, occurred_at, payload_json, attempts, published_at
           ) VALUES (?, ?, ?, ?, ?, 0, NULL)`,
        )
        .bind(event.id, event.eventType, event.aggregateId, event.occurredAt, event.payloadJson),
    ]);
  }

  async claimPending(input: {
    now: string;
    limit: number;
    leaseSeconds: number;
    claimToken: string;
  }) {
    const leaseCutoff = addSeconds(input.now, -input.leaseSeconds);
    const candidates = await this.database
      .prepare(
        `SELECT id, event_type, aggregate_id, occurred_at, payload_json, attempts, published_at,
                claimed_at, claim_token, next_attempt_at, last_error, dead_lettered_at
         FROM outbox_events
         WHERE published_at IS NULL AND dead_lettered_at IS NULL
           AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
           AND (claimed_at IS NULL OR claimed_at <= ?)
         ORDER BY occurred_at
         LIMIT ?`,
      )
      .bind(input.now, leaseCutoff, input.limit)
      .all<OutboxRow>();

    if (candidates.results.length === 0) return [];
    await this.database.batch(
      candidates.results.map((event) =>
        this.database
          .prepare(
            `UPDATE outbox_events
             SET claimed_at = ?, claim_token = ?
             WHERE id = ? AND published_at IS NULL AND dead_lettered_at IS NULL
               AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
               AND (claimed_at IS NULL OR claimed_at <= ?)`,
          )
          .bind(input.now, input.claimToken, event.id, input.now, leaseCutoff),
      ),
    );

    const placeholders = candidates.results.map(() => "?").join(", ");
    const claimed = await this.database
      .prepare(
        `SELECT id, event_type, aggregate_id, occurred_at, payload_json, attempts, published_at,
                claimed_at, claim_token, next_attempt_at, last_error, dead_lettered_at
         FROM outbox_events WHERE claim_token = ? AND id IN (${placeholders}) ORDER BY occurred_at`,
      )
      .bind(input.claimToken, ...candidates.results.map((event) => event.id))
      .all<OutboxRow>();
    return claimed.results.map(mapOutboxEvent);
  }

  async isClaimActive(id: string, claimToken: string) {
    const event = await this.find(id);
    return event !== null && event.publishedAt === null && event.claimToken === claimToken;
  }

  async markPublished(id: string, claimToken: string, publishedAt: string) {
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE outbox_events
           SET published_at = ?, claimed_at = NULL, claim_token = NULL
           WHERE id = ? AND claim_token = ? AND published_at IS NULL`,
        )
        .bind(publishedAt, id, claimToken),
    ]);
    const event = await this.find(id);
    return event?.publishedAt === publishedAt;
  }

  async markFailed(
    id: string,
    claimToken: string,
    failure: OutboxFailure,
  ): Promise<OutboxFailureResult> {
    const event = await this.find(id);
    if (!event || event.publishedAt !== null || event.claimToken !== claimToken) return "ignored";
    const attempts = event.attempts + 1;
    const exhausted = attempts >= failure.maxAttempts;
    await this.database.batch([
      this.database
        .prepare(
          `UPDATE outbox_events
           SET attempts = ?, last_error = ?, next_attempt_at = ?, dead_lettered_at = ?,
               claimed_at = ?, claim_token = ?
           WHERE id = ? AND claim_token = ? AND published_at IS NULL`,
        )
        .bind(
          attempts,
          failure.error,
          exhausted ? null : addSeconds(failure.now, failure.retryDelaySeconds),
          exhausted ? failure.now : null,
          exhausted ? null : event.claimedAt,
          exhausted ? null : event.claimToken,
          id,
          claimToken,
        ),
    ]);
    return exhausted ? "dead_letter" : "retry";
  }

  private async find(id: string) {
    const rows = await this.database
      .prepare(
        `SELECT id, event_type, aggregate_id, occurred_at, payload_json, attempts, published_at,
                claimed_at, claim_token, next_attempt_at, last_error, dead_lettered_at
         FROM outbox_events WHERE id = ? LIMIT 1`,
      )
      .bind(id)
      .all<OutboxRow>();
    return rows.results[0] ? mapOutboxEvent(rows.results[0]) : null;
  }
}

type OutboxRow = {
  id: string;
  event_type: string;
  aggregate_id: string;
  occurred_at: string;
  payload_json: string;
  attempts: number;
  published_at: string | null;
  claimed_at: string | null;
  claim_token: string | null;
  next_attempt_at: string | null;
  last_error: string | null;
  dead_lettered_at: string | null;
};

const mapOutboxEvent = (row: OutboxRow): OutboxEventRecord => ({
  id: row.id,
  eventType: row.event_type,
  aggregateId: row.aggregate_id,
  occurredAt: row.occurred_at,
  payloadJson: row.payload_json,
  attempts: row.attempts,
  publishedAt: row.published_at,
  claimedAt: row.claimed_at,
  claimToken: row.claim_token,
  nextAttemptAt: row.next_attempt_at,
  lastError: row.last_error,
  deadLetteredAt: row.dead_lettered_at,
});

function addSeconds(value: string, seconds: number): string {
  return new Date(new Date(value).getTime() + seconds * 1000).toISOString();
}
