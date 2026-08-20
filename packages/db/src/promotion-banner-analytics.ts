export type PromotionBannerAnalyticsEvent = Readonly<{
  eventId: string;
  bannerId: string;
  event: "impression" | "click";
  occurredAt: string;
}>;

export interface PromotionBannerAnalyticsRepository {
  saveIfActive(event: PromotionBannerAnalyticsEvent): Promise<"saved" | "duplicate" | "ignored">;
}

export class InMemoryPromotionBannerAnalyticsRepository implements PromotionBannerAnalyticsRepository {
  private readonly events = new Set<string>();
  constructor(private readonly activeBannerIds: ReadonlySet<string> = new Set()) {}
  saveIfActive(event: PromotionBannerAnalyticsEvent) {
    if (!this.activeBannerIds.has(event.bannerId)) return Promise.resolve<"ignored">("ignored");
    if (this.events.has(event.eventId)) return Promise.resolve<"duplicate">("duplicate");
    this.events.add(event.eventId);
    return Promise.resolve<"saved">("saved");
  }
}

type AnalyticsStatement = {
  bind(...values: unknown[]): AnalyticsStatement;
  all<T extends Record<string, unknown>>(): Promise<{ results: readonly T[] }>;
};
type AnalyticsDatabase = { prepare(query: string): AnalyticsStatement };

export class D1PromotionBannerAnalyticsRepository implements PromotionBannerAnalyticsRepository {
  constructor(private readonly database: AnalyticsDatabase) {}
  async saveIfActive(event: PromotionBannerAnalyticsEvent) {
    const active = await this.database
      .prepare(
        "SELECT id FROM promotion_banners WHERE id = ? AND status = 'active' AND starts_at <= ? AND ends_at > ? LIMIT 1",
      )
      .bind(event.bannerId, event.occurredAt, event.occurredAt)
      .all<{ id: string }>();
    if (!active.results.length) return "ignored" as const;
    const result = await this.database
      .prepare(
        "INSERT OR IGNORE INTO promotion_banner_analytics (event_id, banner_id, event_type, occurred_at) VALUES (?, ?, ?, ?) RETURNING event_id",
      )
      .bind(event.eventId, event.bannerId, event.event, event.occurredAt)
      .all<{ event_id: string }>();
    return result.results.length ? ("saved" as const) : ("duplicate" as const);
  }
}
