export type PromotionBannerPlacement = "home-hero" | "storefront-strip" | "account-banner";
export type PromotionBannerStatus =
  "draft" | "scheduled" | "active" | "paused" | "expired" | "archived";

export type PromotionBanner = Readonly<{
  id: string;
  placement: PromotionBannerPlacement;
  title: string;
  copy: string;
  ctaLabel: string;
  ctaDestination: string;
  altText: string;
  priority: number;
  startsAt: string;
  endsAt: string;
  desktopObjectKey: string;
  mobileObjectKey: string;
  status: PromotionBannerStatus;
  cacheVersion: number;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}>;

export interface PromotionBannerRepository {
  list(): Promise<readonly PromotionBanner[]>;
  listActive(placement: PromotionBannerPlacement, at: string): Promise<readonly PromotionBanner[]>;
  save(banner: PromotionBanner): Promise<void>;
  updateStatus(id: string, status: PromotionBannerStatus, updatedAt: string): Promise<void>;
}

export class InMemoryPromotionBannerRepository implements PromotionBannerRepository {
  private readonly banners = new Map<string, PromotionBanner>();

  constructor(initial: readonly PromotionBanner[] = []) {
    for (const banner of initial) this.banners.set(banner.id, banner);
  }

  list() {
    return Promise.resolve(
      [...this.banners.values()].sort((left, right) => right.priority - left.priority),
    );
  }

  listActive(placement: PromotionBannerPlacement, at: string) {
    return this.list().then((banners) =>
      banners.filter(
        (banner) =>
          banner.placement === placement &&
          banner.status === "active" &&
          banner.startsAt <= at &&
          banner.endsAt > at,
      ),
    );
  }

  save(banner: PromotionBanner) {
    this.banners.set(banner.id, banner);
    return Promise.resolve();
  }

  updateStatus(id: string, status: PromotionBannerStatus, updatedAt: string) {
    const banner = this.banners.get(id);
    if (banner)
      this.banners.set(id, { ...banner, status, cacheVersion: banner.cacheVersion + 1, updatedAt });
    return Promise.resolve();
  }
}

type BannerStatement = {
  bind(...values: unknown[]): BannerStatement;
  all<T extends Record<string, unknown>>(): Promise<{ results: readonly T[] }>;
};
type BannerDatabase = {
  prepare(query: string): BannerStatement;
  batch(statements: readonly BannerStatement[]): Promise<unknown>;
};

export class D1PromotionBannerRepository implements PromotionBannerRepository {
  constructor(private readonly database: BannerDatabase) {}

  async list() {
    const rows = await this.database
      .prepare("SELECT * FROM promotion_banners ORDER BY priority DESC, created_at DESC")
      .bind()
      .all<BannerRow>();
    return rows.results.map(mapBanner);
  }

  async listActive(placement: PromotionBannerPlacement, at: string) {
    const rows = await this.database
      .prepare(
        "SELECT * FROM promotion_banners WHERE placement = ? AND status = 'active' AND starts_at <= ? AND ends_at > ? ORDER BY priority DESC, created_at DESC",
      )
      .bind(placement, at, at)
      .all<BannerRow>();
    return rows.results.map(mapBanner);
  }

  async save(banner: PromotionBanner) {
    await this.database.batch([
      this.database
        .prepare(
          "INSERT INTO promotion_banners (id, placement, title, copy, cta_label, cta_destination, alt_text, priority, starts_at, ends_at, desktop_object_key, mobile_object_key, status, cache_version, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, copy = excluded.copy, cta_label = excluded.cta_label, cta_destination = excluded.cta_destination, alt_text = excluded.alt_text, priority = excluded.priority, starts_at = excluded.starts_at, ends_at = excluded.ends_at, desktop_object_key = excluded.desktop_object_key, mobile_object_key = excluded.mobile_object_key, status = excluded.status, cache_version = excluded.cache_version, updated_at = excluded.updated_at",
        )
        .bind(
          banner.id,
          banner.placement,
          banner.title,
          banner.copy,
          banner.ctaLabel,
          banner.ctaDestination,
          banner.altText,
          banner.priority,
          banner.startsAt,
          banner.endsAt,
          banner.desktopObjectKey,
          banner.mobileObjectKey,
          banner.status,
          banner.cacheVersion,
          banner.createdByUserId,
          banner.createdAt,
          banner.updatedAt,
        ),
    ]);
  }

  async updateStatus(id: string, status: PromotionBannerStatus, updatedAt: string) {
    await this.database.batch([
      this.database
        .prepare(
          "UPDATE promotion_banners SET status = ?, cache_version = cache_version + 1, updated_at = ? WHERE id = ?",
        )
        .bind(status, updatedAt, id),
    ]);
  }
}

type BannerRow = Omit<
  PromotionBanner,
  | "ctaLabel"
  | "ctaDestination"
  | "altText"
  | "startsAt"
  | "endsAt"
  | "desktopObjectKey"
  | "mobileObjectKey"
  | "cacheVersion"
  | "createdByUserId"
  | "createdAt"
  | "updatedAt"
> &
  Record<string, unknown>;
function mapBanner(row: BannerRow): PromotionBanner {
  return {
    id: String(row.id),
    placement: row.placement,
    title: String(row.title),
    copy: String(row.copy),
    ctaLabel: String(row.cta_label),
    ctaDestination: String(row.cta_destination),
    altText: String(row.alt_text),
    priority: Number(row.priority),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    desktopObjectKey: String(row.desktop_object_key),
    mobileObjectKey: String(row.mobile_object_key),
    status: row.status,
    cacheVersion: Number(row.cache_version),
    createdByUserId: String(row.created_by_user_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
