import {
  calculateCatalogPrice,
  createAuditEvent,
  createCatalogCategory,
  createCatalogMarkupRule,
  createCatalogPriceHistoryEntry,
  createCatalogSku,
  createDeliveryWindow,
  createMoney,
  type AuditEvent,
  type CatalogCategory,
  type CatalogMarkupRule,
  type CatalogPriceHistoryEntry,
  type CatalogSku,
  type CatalogUnit,
  type DeliveryWindow,
  type Money,
} from "@carbon/domain";

export type LaunchCatalogSkuInput = Readonly<{
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  unit: CatalogUnit;
  imageUrl: string | null;
  procurementCostCentavos: number;
  markupBasisPoints: number;
  priceEffectiveAt: string;
  active: boolean;
}>;

export type LaunchDeliveryWindowInput = Readonly<{
  id: string;
  cycleId: string;
  label: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  active: boolean;
}>;

export type LaunchConfigurationInput = Readonly<{
  reason: string;
  categories: readonly CatalogCategory[];
  skus: readonly LaunchCatalogSkuInput[];
  deliveryWindows: readonly LaunchDeliveryWindowInput[];
}>;

export type LaunchCatalogSku = Readonly<{
  sku: CatalogSku;
  procurementCost: Money;
  markupRule: CatalogMarkupRule;
  priceHistory: CatalogPriceHistoryEntry;
}>;

export type LaunchConfiguration = Readonly<{
  categories: readonly CatalogCategory[];
  skus: readonly LaunchCatalogSku[];
  deliveryWindows: readonly DeliveryWindow[];
}>;

export type LaunchConfigurationResult = Readonly<{
  idempotencyKey: string;
  categoryCount: number;
  skuCount: number;
  deliveryWindowCount: number;
  appliedAt: string;
}>;

export type LaunchConfigurationCommand = Readonly<{
  idempotencyKey: string;
  fingerprint: string;
  result: LaunchConfigurationResult;
}>;

export interface LaunchConfigurationRepository {
  findCommand(idempotencyKey: string): Promise<LaunchConfigurationCommand | null>;
  apply(
    configuration: LaunchConfiguration,
    command: LaunchConfigurationCommand,
    auditEvent: AuditEvent,
  ): Promise<void>;
}

export class LaunchConfigurationConflictError extends Error {
  constructor() {
    super("idempotency key was already used for a different launch configuration");
    this.name = "LaunchConfigurationConflictError";
  }
}

export class LaunchConfigurationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaunchConfigurationValidationError";
  }
}

export class LaunchConfigurationService {
  constructor(
    private readonly repository: LaunchConfigurationRepository,
    private readonly generateId: () => string = () => crypto.randomUUID(),
  ) {}

  async apply(
    input: Readonly<{
      actorUserId: string;
      idempotencyKey: string;
      correlationId: string;
      appliedAt: string;
      configuration: LaunchConfigurationInput;
    }>,
  ): Promise<LaunchConfigurationResult & Readonly<{ replayed: boolean }>> {
    let idempotencyKey: string;
    let actorUserId: string;
    let correlationId: string;
    let reason: string;
    let configuration: LaunchConfiguration;
    try {
      idempotencyKey = normalizeRequiredText(input.idempotencyKey, "idempotency key", 128);
      actorUserId = normalizeRequiredText(input.actorUserId, "actor user id", 128);
      correlationId = normalizeRequiredText(input.correlationId, "correlation id", 128);
      reason = normalizeRequiredText(input.configuration.reason, "reason", 500);
      configuration = normalizeConfiguration(input.configuration, input.appliedAt);
    } catch (error) {
      throw new LaunchConfigurationValidationError(
        error instanceof Error ? error.message : "launch configuration is invalid",
      );
    }
    const fingerprint = createConfigurationFingerprint(reason, configuration);
    const existing = await this.repository.findCommand(idempotencyKey);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new LaunchConfigurationConflictError();
      return { ...existing.result, replayed: true };
    }

    const result: LaunchConfigurationResult = {
      idempotencyKey,
      categoryCount: configuration.categories.length,
      skuCount: configuration.skus.length,
      deliveryWindowCount: configuration.deliveryWindows.length,
      appliedAt: input.appliedAt,
    };
    const command = { idempotencyKey, fingerprint, result };
    const auditEvent = createAuditEvent({
      id: this.generateId(),
      actorUserId,
      action: "launch-configuration.applied",
      targetType: "launch-configuration",
      targetId: idempotencyKey,
      occurredAt: input.appliedAt,
      metadata: {
        reason,
        correlationId,
        categoryCount: String(result.categoryCount),
        skuCount: String(result.skuCount),
        deliveryWindowCount: String(result.deliveryWindowCount),
      },
    });

    try {
      await this.repository.apply(configuration, command, auditEvent);
      return { ...result, replayed: false };
    } catch (error) {
      const raced = await this.repository.findCommand(idempotencyKey);
      if (!raced) throw error;
      if (raced.fingerprint !== fingerprint) throw new LaunchConfigurationConflictError();
      return { ...raced.result, replayed: true };
    }
  }
}

export class InMemoryLaunchConfigurationRepository implements LaunchConfigurationRepository {
  private readonly commands = new Map<string, LaunchConfigurationCommand>();
  readonly applied: Array<
    Readonly<{ configuration: LaunchConfiguration; auditEvent: AuditEvent }>
  > = [];

  findCommand(idempotencyKey: string): Promise<LaunchConfigurationCommand | null> {
    return Promise.resolve(this.commands.get(idempotencyKey) ?? null);
  }

  apply(
    configuration: LaunchConfiguration,
    command: LaunchConfigurationCommand,
    auditEvent: AuditEvent,
  ): Promise<void> {
    this.commands.set(command.idempotencyKey, command);
    this.applied.push({ configuration, auditEvent });
    return Promise.resolve();
  }
}

function normalizeConfiguration(
  input: LaunchConfigurationInput,
  appliedAt: string,
): LaunchConfiguration {
  assertIsoTimestamp(appliedAt, "appliedAt");
  const categories = input.categories.map(createCatalogCategory).sort(compareById);
  assertUnique(categories, (category) => category.id, "category id");
  assertUnique(categories, (category) => category.slug, "category slug");
  const categoryIds = new Set(categories.map((category) => category.id));

  const skus = input.skus
    .map((inputSku) => normalizeSku(inputSku, categoryIds))
    .sort((left, right) => left.sku.id.localeCompare(right.sku.id));
  assertUnique(skus, (item) => item.sku.id, "SKU id");
  assertUnique(skus, (item) => item.sku.slug, "SKU slug");

  const deliveryWindows = input.deliveryWindows
    .map((window) =>
      createDeliveryWindow({ ...window, createdAt: appliedAt, updatedAt: appliedAt }),
    )
    .sort(compareById);
  assertUnique(deliveryWindows, (window) => window.id, "delivery window id");

  return { categories, skus, deliveryWindows };
}

function normalizeSku(
  input: LaunchCatalogSkuInput,
  categoryIds: ReadonlySet<string>,
): LaunchCatalogSku {
  if (!categoryIds.has(input.categoryId)) {
    throw new Error(`SKU ${input.id} references a category outside this launch configuration`);
  }
  const procurementCost = createMoney(input.procurementCostCentavos);
  const fallbackMarkup = createCatalogMarkupRule({
    id: `launch-base:${input.id}`,
    skuId: null,
    basisPoints: 0,
    effectiveAt: input.priceEffectiveAt,
  });
  const markupRule = createCatalogMarkupRule({
    id: `launch-markup:${input.id}`,
    skuId: input.id,
    basisPoints: input.markupBasisPoints,
    effectiveAt: input.priceEffectiveAt,
  });
  const price = calculateCatalogPrice(procurementCost, fallbackMarkup, markupRule);
  if (input.active && price.centavos <= 0) {
    throw new Error(`active SKU ${input.id} must resolve to a non-zero server-owned price`);
  }
  const sku = createCatalogSku({
    id: input.id,
    categoryId: input.categoryId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    unit: input.unit,
    imageUrl: input.imageUrl,
    price,
    active: input.active,
  });
  const priceHistory = createCatalogPriceHistoryEntry(
    {
      id: `launch-price:${input.id}:${input.priceEffectiveAt}`,
      skuId: input.id,
      procurementCost,
      markupBasisPoints: input.markupBasisPoints,
      price,
      effectiveAt: input.priceEffectiveAt,
    },
    fallbackMarkup,
    markupRule,
  );
  return { sku, procurementCost, markupRule, priceHistory };
}

function createConfigurationFingerprint(
  reason: string,
  configuration: LaunchConfiguration,
): string {
  return JSON.stringify({
    reason,
    categories: configuration.categories,
    skus: configuration.skus,
    deliveryWindows: configuration.deliveryWindows.map((window) => ({
      id: window.id,
      cycleId: window.cycleId,
      label: window.label,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      capacity: window.capacity,
      active: window.active,
    })),
  });
}

function normalizeRequiredText(value: string, field: string, maxLength: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`${field} must be between 1 and ${maxLength} characters`);
  }
  return normalized;
}

function assertUnique<T>(values: readonly T[], key: (value: T) => string, field: string): void {
  const keys = values.map(key);
  if (new Set(keys).size !== keys.length) throw new Error(`${field} values must be unique`);
}

function assertIsoTimestamp(value: string, field: string): void {
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new Error(`${field} must be an ISO timestamp`);
  }
}

function compareById<T extends Readonly<{ id: string }>>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}
