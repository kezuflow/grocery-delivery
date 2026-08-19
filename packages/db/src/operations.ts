import type { CatalogDatabase } from "./catalog.js";

export type OutboxProjection = Readonly<{
  pendingCount: number;
  oldestPendingAt: string | null;
  deadLetteredCount: number;
}>;

export type DeliveryProjection = Readonly<{
  totalAssignments: number;
  assigned: number;
  outForDelivery: number;
  delivered: number;
  failed: number;
}>;

export type ProcurementProjection = Readonly<{
  openShortages: number;
  exceptionalManifests: number;
}>;

export type OperationalProjection = Readonly<{
  cycleId: string;
  generatedAt: string;
  outbox: OutboxProjection;
  delivery: DeliveryProjection;
  procurement: ProcurementProjection;
}>;

export interface OperationalProjectionRepository {
  get(cycleId: string, generatedAt: string): Promise<OperationalProjection>;
}

export class InMemoryOperationalProjectionRepository implements OperationalProjectionRepository {
  constructor(
    private readonly values: Readonly<{
      outbox?: OutboxProjection;
      delivery?: DeliveryProjection;
      procurement?: ProcurementProjection;
    }> = {},
  ) {}

  get(cycleId: string, generatedAt: string): Promise<OperationalProjection> {
    return Promise.resolve({
      cycleId,
      generatedAt,
      outbox: this.values.outbox ?? {
        pendingCount: 0,
        oldestPendingAt: null,
        deadLetteredCount: 0,
      },
      delivery: this.values.delivery ?? {
        totalAssignments: 0,
        assigned: 0,
        outForDelivery: 0,
        delivered: 0,
        failed: 0,
      },
      procurement: this.values.procurement ?? {
        openShortages: 0,
        exceptionalManifests: 0,
      },
    });
  }
}

export class D1OperationalProjectionRepository implements OperationalProjectionRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async get(cycleId: string, generatedAt: string): Promise<OperationalProjection> {
    const [outbox, delivery, procurement] = await Promise.all([
      this.readOutbox(),
      this.readDelivery(cycleId),
      this.readProcurement(cycleId),
    ]);
    return { cycleId, generatedAt, outbox, delivery, procurement };
  }

  private async readOutbox(): Promise<OutboxProjection> {
    const result = await this.database
      .prepare(
        `SELECT
           SUM(CASE WHEN published_at IS NULL AND dead_lettered_at IS NULL THEN 1 ELSE 0 END) AS pending_count,
           MIN(CASE WHEN published_at IS NULL AND dead_lettered_at IS NULL THEN occurred_at ELSE NULL END) AS oldest_pending_at,
           SUM(CASE WHEN dead_lettered_at IS NOT NULL THEN 1 ELSE 0 END) AS dead_lettered_count
         FROM outbox_events`,
      )
      .all<OutboxRow>();
    const row = result.results[0];
    return {
      pendingCount: Number(row?.pending_count ?? 0),
      oldestPendingAt: row?.oldest_pending_at ?? null,
      deadLetteredCount: Number(row?.dead_lettered_count ?? 0),
    };
  }

  private async readDelivery(cycleId: string): Promise<DeliveryProjection> {
    const result = await this.database
      .prepare(
        `SELECT status, COUNT(*) AS count
         FROM dispatch_assignments WHERE cycle_id = ? GROUP BY status`,
      )
      .bind(cycleId)
      .all<StatusRow>();
    const counts = new Map(result.results.map((row) => [row.status, Number(row.count)]));
    return {
      totalAssignments: [...counts.values()].reduce((sum, count) => sum + count, 0),
      assigned: counts.get("assigned") ?? 0,
      outForDelivery: counts.get("out_for_delivery") ?? 0,
      delivered: counts.get("delivered") ?? 0,
      failed: counts.get("failed") ?? 0,
    };
  }

  private async readProcurement(cycleId: string): Promise<ProcurementProjection> {
    const [shortages, manifests] = await Promise.all([
      this.database
        .prepare(
          "SELECT COUNT(*) AS count FROM procurement_shortages WHERE cycle_id = ? AND status = 'open'",
        )
        .bind(cycleId)
        .all<CountRow>(),
      this.database
        .prepare(
          "SELECT COUNT(*) AS count FROM packing_manifests WHERE cycle_id = ? AND status = 'exception'",
        )
        .bind(cycleId)
        .all<CountRow>(),
    ]);
    return {
      openShortages: Number(shortages.results[0]?.count ?? 0),
      exceptionalManifests: Number(manifests.results[0]?.count ?? 0),
    };
  }
}

type CountRow = { count: number };
type StatusRow = {
  status: "assigned" | "out_for_delivery" | "delivered" | "failed";
  count: number;
};
type OutboxRow = {
  pending_count: number | null;
  oldest_pending_at: string | null;
  dead_lettered_count: number | null;
};
