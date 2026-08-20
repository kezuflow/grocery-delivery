import {
  evaluatePromotion,
  normalizePromotionCode,
  type Promotion,
  type PromotionContext,
  type PromotionResult,
} from "@carbon/domain";

export type PromotionRedemption = Readonly<{
  id: string;
  promotionId: string;
  customerId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  result: PromotionResult;
  createdAt: string;
}>;

export interface PromotionRepository {
  findActiveByCode(code: string): Promise<Promotion | null>;
  findRedemption(customerId: string, idempotencyKey: string): Promise<PromotionRedemption | null>;
  countCustomerRedemptions(promotionId: string, customerId: string): Promise<number>;
  saveRedemption(redemption: PromotionRedemption): Promise<void>;
}

export class InMemoryPromotionRepository implements PromotionRepository {
  private readonly promotions: readonly Promotion[];
  private readonly redemptions = new Map<string, PromotionRedemption>();

  constructor(promotions: readonly Promotion[] = []) {
    this.promotions = promotions;
  }
  findActiveByCode(code: string): Promise<Promotion | null> {
    return Promise.resolve(this.promotions.find((promotion) => promotion.code === code) ?? null);
  }
  findRedemption(customerId: string, idempotencyKey: string): Promise<PromotionRedemption | null> {
    return Promise.resolve(this.redemptions.get(`${customerId}:${idempotencyKey}`) ?? null);
  }
  countCustomerRedemptions(promotionId: string, customerId: string): Promise<number> {
    return Promise.resolve(
      [...this.redemptions.values()].filter(
        (redemption) =>
          redemption.promotionId === promotionId &&
          redemption.customerId === customerId &&
          !redemption.result.reason,
      ).length,
    );
  }
  saveRedemption(redemption: PromotionRedemption): Promise<void> {
    this.redemptions.set(`${redemption.customerId}:${redemption.idempotencyKey}`, redemption);
    return Promise.resolve();
  }
}

export class PromotionRedemptionService {
  constructor(
    private readonly repository: PromotionRepository,
    private readonly generateId: () => string = () => crypto.randomUUID(),
  ) {}

  async apply(
    input: Readonly<{
      customerId: string;
      code: string;
      idempotencyKey: string;
      context: Omit<PromotionContext, "customerRedemptions">;
    }>,
  ): Promise<PromotionRedemption> {
    const key = input.idempotencyKey.trim();
    if (!key || key.length > 128)
      throw new Error("idempotency key must be between 1 and 128 characters");
    const code = normalizePromotionCode(input.code);
    const fingerprint = JSON.stringify({
      customerId: input.customerId,
      code,
      context: input.context,
    });
    const existing = await this.repository.findRedemption(input.customerId, key);
    if (existing) {
      if (existing.requestFingerprint !== fingerprint)
        throw new Error("idempotency key was already used for a different promotion request");
      return existing;
    }
    const promotion = await this.repository.findActiveByCode(code);
    if (!promotion) throw new Error("promotion was not found");
    const customerRedemptions = await this.repository.countCustomerRedemptions(
      promotion.id,
      input.customerId,
    );
    const result = evaluatePromotion(promotion, { ...input.context, customerRedemptions });
    if (result.reason) throw new Error(result.reason);
    const redemption = {
      id: this.generateId(),
      promotionId: promotion.id,
      customerId: input.customerId,
      idempotencyKey: key,
      requestFingerprint: fingerprint,
      result,
      createdAt: input.context.now,
    };
    await this.repository.saveRedemption(redemption);
    return redemption;
  }
}

export function assertPromotionStacking(promotions: readonly Promotion[]): void {
  if (promotions.length <= 1) return;
  if (promotions.some((promotion) => !promotion.allowsStacking))
    throw new Error("promotions cannot be stacked");
}
