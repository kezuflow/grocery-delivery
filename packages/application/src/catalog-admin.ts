import {
  calculateCatalogPrice,
  createAuditEvent,
  createCatalogCategory,
  createCatalogMarkupRule,
  createCatalogSku,
  createMoney,
  type AuditEvent,
  type CatalogCategory,
  type CatalogSku,
  type CatalogUnit,
} from "@carbon/domain";

export type CatalogAdminLifecycle = "active" | "paused" | "archived";

export type CatalogAdminItem = CatalogSku &
  Readonly<{
    procurementCostCentavos: number;
    markupBasisPoints: number;
    status: CatalogAdminLifecycle;
  }>;

export type CatalogAdminSnapshot = Readonly<{
  categories: readonly CatalogCategory[];
  items: readonly CatalogAdminItem[];
}>;

export type CatalogAdminCommandResult =
  | Readonly<{ kind: "category"; category: CatalogCategory }>
  | Readonly<{ kind: "sku"; item: CatalogAdminItem }>;

export type CatalogAdminCommand = Readonly<{
  idempotencyKey: string;
  fingerprint: string;
  result: CatalogAdminCommandResult;
  appliedAt: string;
}>;

export interface CatalogAdminCommandRepository {
  list(): Promise<CatalogAdminSnapshot>;
  findCommand(idempotencyKey: string): Promise<CatalogAdminCommand | null>;
  findCategoryById(id: string): Promise<CatalogCategory | null>;
  findCategoryBySlug(slug: string): Promise<CatalogCategory | null>;
  findSkuById(id: string): Promise<CatalogAdminItem | null>;
  findSkuBySlug(slug: string): Promise<CatalogAdminItem | null>;
  applyCategory(command: CatalogAdminCommand, auditEvent: AuditEvent): Promise<void>;
  applySku(command: CatalogAdminCommand, auditEvent: AuditEvent): Promise<void>;
}

export class CatalogAdminValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogAdminValidationError";
  }
}

export class CatalogAdminConflictError extends Error {
  constructor(message = "idempotency key was already used for a different catalog change") {
    super(message);
    this.name = "CatalogAdminConflictError";
  }
}

export class CatalogAdminNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogAdminNotFoundError";
  }
}

type CommandContext = Readonly<{
  actorUserId: string;
  correlationId: string;
  idempotencyKey: string;
  appliedAt: string;
}>;

export class CatalogAdminService {
  constructor(
    private readonly repository: CatalogAdminCommandRepository,
    private readonly generateId: () => string = () => crypto.randomUUID(),
  ) {}

  list(): Promise<CatalogAdminSnapshot> {
    return this.repository.list();
  }

  async upsertCategory(
    context: CommandContext,
    input: Readonly<{ id?: string; name: string; active: boolean }>,
  ): Promise<Readonly<{ category: CatalogCategory; replayed: boolean }>> {
    const normalized = normalizeContext(context);
    const name = normalizeRequiredText(input.name, "category name", 160);
    const fingerprint = JSON.stringify({
      action: "category.upsert",
      id: input.id ?? null,
      name,
      active: input.active,
    });
    const replay = await this.replay(normalized.idempotencyKey, fingerprint, "category");
    if (replay?.kind === "category") return { category: replay.category, replayed: true };
    const existing = input.id
      ? await this.repository.findCategoryById(input.id)
      : await this.repository.findCategoryBySlug(slugify(name));
    if (input.id && !existing)
      throw new CatalogAdminNotFoundError("catalog category was not found");
    if (!input.id && existing) {
      throw new CatalogAdminConflictError("a catalog category with this name already exists");
    }
    const category = createCatalogCategory({
      id: existing?.id ?? `category-${this.generateId()}`,
      name,
      slug: existing?.slug ?? slugify(name),
      active: input.active,
    });
    const command: CatalogAdminCommand = {
      idempotencyKey: normalized.idempotencyKey,
      fingerprint,
      result: { kind: "category", category },
      appliedAt: normalized.appliedAt,
    };
    const audit = this.createAudit(normalized, "category", category.id);
    await this.applyWithRace(command, () => this.repository.applyCategory(command, audit));
    return { category, replayed: false };
  }

  async upsertSku(
    context: CommandContext,
    input: Readonly<{
      id?: string;
      categoryId: string;
      name: string;
      description: string;
      unit: CatalogUnit;
      imageUrl: string | null;
      procurementCostCentavos: number;
      markupBasisPoints: number;
      status: CatalogAdminLifecycle;
    }>,
  ): Promise<Readonly<{ item: CatalogAdminItem; replayed: boolean }>> {
    const normalized = normalizeContext(context);
    const categoryId = normalizeRequiredText(input.categoryId, "category", 128);
    const name = normalizeRequiredText(input.name, "product name", 160);
    const description = normalizeRequiredText(input.description, "description", 1_000);
    const fingerprint = JSON.stringify({
      action: "sku.upsert",
      id: input.id ?? null,
      categoryId,
      name,
      description,
      unit: input.unit,
      imageUrl: input.imageUrl,
      procurementCostCentavos: input.procurementCostCentavos,
      markupBasisPoints: input.markupBasisPoints,
      status: input.status,
    });
    const replay = await this.replay(normalized.idempotencyKey, fingerprint, "sku");
    if (replay?.kind === "sku") return { item: replay.item, replayed: true };
    if (!(await this.repository.findCategoryById(categoryId))) {
      throw new CatalogAdminValidationError("select an existing catalog category");
    }
    const existing = input.id
      ? await this.repository.findSkuById(input.id)
      : await this.repository.findSkuBySlug(slugify(name));
    if (input.id && !existing) throw new CatalogAdminNotFoundError("catalog item was not found");
    if (!input.id && existing) {
      throw new CatalogAdminConflictError("a catalog item with this name already exists");
    }
    const id = existing?.id ?? `sku-${this.generateId()}`;
    const procurementCost = createMoney(input.procurementCostCentavos);
    const baseMarkup = createCatalogMarkupRule({
      id: `catalog-base:${id}`,
      skuId: null,
      basisPoints: 0,
      effectiveAt: normalized.appliedAt,
    });
    const skuMarkup = createCatalogMarkupRule({
      id: `catalog-markup:${id}:${normalized.appliedAt}`,
      skuId: id,
      basisPoints: input.markupBasisPoints,
      effectiveAt: normalized.appliedAt,
    });
    const price = calculateCatalogPrice(procurementCost, baseMarkup, skuMarkup);
    if (input.status === "active" && price.centavos <= 0) {
      throw new CatalogAdminValidationError("an active product must have a non-zero selling price");
    }
    const sku = createCatalogSku({
      id,
      categoryId,
      name,
      slug: existing?.slug ?? slugify(name),
      description,
      unit: input.unit,
      imageUrl: input.imageUrl,
      price,
      active: input.status === "active",
    });
    const item: CatalogAdminItem = {
      ...sku,
      procurementCostCentavos: procurementCost.centavos,
      markupBasisPoints: input.markupBasisPoints,
      status: input.status,
    };
    const command: CatalogAdminCommand = {
      idempotencyKey: normalized.idempotencyKey,
      fingerprint,
      result: { kind: "sku", item },
      appliedAt: normalized.appliedAt,
    };
    const audit = this.createAudit(normalized, "sku", item.id);
    await this.applyWithRace(command, () => this.repository.applySku(command, audit));
    return { item, replayed: false };
  }

  private async replay(
    idempotencyKey: string,
    fingerprint: string,
    kind: CatalogAdminCommandResult["kind"],
  ): Promise<CatalogAdminCommandResult | null> {
    const existing = await this.repository.findCommand(idempotencyKey);
    if (!existing) return null;
    if (existing.fingerprint !== fingerprint || existing.result.kind !== kind) {
      throw new CatalogAdminConflictError();
    }
    return existing.result;
  }

  private async applyWithRace(
    command: CatalogAdminCommand,
    apply: () => Promise<void>,
  ): Promise<void> {
    try {
      await apply();
    } catch (error) {
      const raced = await this.repository.findCommand(command.idempotencyKey);
      if (!raced) throw error;
      if (raced.fingerprint !== command.fingerprint) throw new CatalogAdminConflictError();
    }
  }

  private createAudit(
    context: CommandContext,
    targetType: "category" | "sku",
    targetId: string,
  ): AuditEvent {
    return createAuditEvent({
      id: this.generateId(),
      actorUserId: context.actorUserId,
      action: `catalog.${targetType}.upserted`,
      targetType: `catalog-${targetType}`,
      targetId,
      occurredAt: context.appliedAt,
      metadata: { correlationId: context.correlationId, idempotencyKey: context.idempotencyKey },
    });
  }
}

export class InMemoryCatalogAdminCommandRepository implements CatalogAdminCommandRepository {
  private readonly commands = new Map<string, CatalogAdminCommand>();
  private readonly categories = new Map<string, CatalogCategory>();
  private readonly items = new Map<string, CatalogAdminItem>();
  readonly audits: AuditEvent[] = [];

  constructor(seed: CatalogAdminSnapshot = { categories: [], items: [] }) {
    for (const category of seed.categories) this.categories.set(category.id, category);
    for (const item of seed.items) this.items.set(item.id, item);
  }

  list(): Promise<CatalogAdminSnapshot> {
    return Promise.resolve({
      categories: [...this.categories.values()],
      items: [...this.items.values()],
    });
  }

  findCommand(idempotencyKey: string): Promise<CatalogAdminCommand | null> {
    return Promise.resolve(this.commands.get(idempotencyKey) ?? null);
  }

  findCategoryById(id: string): Promise<CatalogCategory | null> {
    return Promise.resolve(this.categories.get(id) ?? null);
  }

  findCategoryBySlug(slug: string): Promise<CatalogCategory | null> {
    return Promise.resolve(
      [...this.categories.values()].find((category) => category.slug === slug) ?? null,
    );
  }

  findSkuById(id: string): Promise<CatalogAdminItem | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  findSkuBySlug(slug: string): Promise<CatalogAdminItem | null> {
    return Promise.resolve([...this.items.values()].find((item) => item.slug === slug) ?? null);
  }

  applyCategory(command: CatalogAdminCommand, auditEvent: AuditEvent): Promise<void> {
    if (command.result.kind !== "category") throw new Error("category result is required");
    this.categories.set(command.result.category.id, command.result.category);
    this.commands.set(command.idempotencyKey, command);
    this.audits.push(auditEvent);
    return Promise.resolve();
  }

  applySku(command: CatalogAdminCommand, auditEvent: AuditEvent): Promise<void> {
    if (command.result.kind !== "sku") throw new Error("SKU result is required");
    this.items.set(command.result.item.id, command.result.item);
    this.commands.set(command.idempotencyKey, command);
    this.audits.push(auditEvent);
    return Promise.resolve();
  }
}

function normalizeContext(context: CommandContext): CommandContext {
  const appliedAt = new Date(context.appliedAt).toISOString();
  return {
    actorUserId: normalizeRequiredText(context.actorUserId, "actor user id", 128),
    correlationId: normalizeRequiredText(context.correlationId, "correlation id", 128),
    idempotencyKey: normalizeRequiredText(context.idempotencyKey, "idempotency key", 128),
    appliedAt,
  };
}

function normalizeRequiredText(value: string, field: string, maxLength: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new CatalogAdminValidationError(`${field} must be between 1 and ${maxLength} characters`);
  }
  return normalized;
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) throw new CatalogAdminValidationError("name must contain letters or numbers");
  return slug;
}
