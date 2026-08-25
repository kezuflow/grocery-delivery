"use client";

import type { LaunchConfigurationApplyRequest } from "@carbon/contracts";
import { CalendarDays, Check, ChevronRight, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AdminButton as Button,
  AdminInput as Input,
  AdminPanel,
  AdminPanelHeader,
  AdminSaveBar,
  AdminSelect as Select,
} from "../../components/ui";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

type CategoryDraft = LaunchConfigurationApplyRequest["categories"][number];
type SkuDraft = LaunchConfigurationApplyRequest["skus"][number];
type DeliveryWindowDraft = LaunchConfigurationApplyRequest["deliveryWindows"][number];

const unitOptions: SkuDraft["unit"][] = [
  "piece",
  "gram",
  "kilogram",
  "milliliter",
  "liter",
  "pack",
];

export function LaunchConfigurationForm() {
  const router = useRouter();
  const client = createApiClient(createSameOriginApiTransport());
  const [reason, setReason] = useState("");
  const [categories, setCategories] = useState<CategoryDraft[]>([createCategoryDraft()]);
  const [skus, setSkus] = useState<SkuDraft[]>([createSkuDraft()]);
  const [deliveryWindows, setDeliveryWindows] = useState<DeliveryWindowDraft[]>([
    createDeliveryWindowDraft(),
  ]);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setIdempotencyKey(crypto.randomUUID()), []);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[180px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <nav aria-label="Configuration sections" className="sticky top-20 grid gap-1 text-sm">
          {[
            ["#release", "Release approval"],
            ["#categories", "Categories"],
            ["#catalog-items", "Catalog items"],
            ["#delivery-windows", "Delivery windows"],
          ].map(([href, label]) => (
            <a
              className="flex min-h-9 items-center justify-between rounded-md px-3 text-admin-text-secondary hover:bg-admin-surface-hover hover:text-admin-text-primary"
              href={href}
              key={href}
            >
              {label}
              <ChevronRight aria-hidden="true" size={13} />
            </a>
          ))}
        </nav>
      </aside>
      <AdminPanel aria-labelledby="launch-config-title">
        <AdminPanelHeader
          actions={
            <span className="inline-flex items-center gap-2 rounded-md bg-admin-accent-soft px-2.5 py-1.5 text-xs font-semibold text-admin-accent">
              <Check aria-hidden="true" size={14} /> Draft changes are local
            </span>
          }
          description="Prepare one reviewed catalog and delivery-window release. Retail prices remain calculated and validated by the server."
          eyebrow="Protected release"
          title="Launch configuration"
        />
        <form
          className="px-4 sm:px-5"
          onSubmit={(event) => {
            event.preventDefault();
            void applyConfiguration();
          }}
        >
          <section
            className="grid gap-4 border-b border-admin-border py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            id="release"
          >
            <Input
              label="Approval reason"
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Approved by launch owner on 2026-08-24"
              required
              value={reason}
            />
            <div className="flex items-end">
              <p className="rounded-md border border-admin-border bg-admin-surface-subtle px-3 py-2 text-xs leading-5 text-admin-text-secondary">
                Applying replaces the approved catalog and delivery-window set as one idempotent
                release. Verify each section before publishing.
              </p>
            </div>
          </section>

          <DraftSection
            count={categories.length}
            description="Organize the products shoppers see in the market."
            id="categories"
            onAdd={() =>
              setCategories((current) => [...current, createCategoryDraft(current.length)])
            }
            title="Categories"
          >
            <div className="grid gap-3">
              {categories.map((category, index) => (
                <div
                  className="grid gap-3 border-b border-admin-border pb-4 last:border-0 last:pb-0 md:grid-cols-[1fr_1fr_1fr_auto]"
                  key={`category-row-${index}`}
                >
                  <Input
                    label="Name"
                    onChange={(event) => updateCategory(index, "name", event.target.value)}
                    placeholder="Fresh produce"
                    required
                    value={category.name}
                  />
                  <Input
                    label="Slug"
                    onChange={(event) => updateCategory(index, "slug", event.target.value)}
                    placeholder="fresh-produce"
                    required
                    value={category.slug}
                  />
                  <Input
                    label="ID"
                    onChange={(event) => updateCategory(index, "id", event.target.value)}
                    placeholder="category-fresh-produce"
                    required
                    value={category.id}
                  />
                  <DraftRowActions
                    canRemove={categories.length > 1}
                    onRemove={() => removeCategory(index)}
                    active={category.active}
                    onToggle={() => updateCategory(index, "active", !category.active)}
                  />
                </div>
              ))}
            </div>
          </DraftSection>

          <DraftSection
            count={skus.length}
            description="Set procurement inputs and merchandising details. Retail prices remain server-owned."
            id="catalog-items"
            onAdd={() => setSkus((current) => [...current, createSkuDraft(current.length)])}
            title="Catalog items"
          >
            <div className="grid gap-4">
              {skus.map((sku, index) => (
                <div
                  className="grid gap-4 border-b border-admin-border pb-5 last:border-0 last:pb-0"
                  key={`sku-row-${index}`}
                >
                  <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
                    <Input
                      label="Product name"
                      onChange={(event) => updateSku(index, "name", event.target.value)}
                      placeholder="Organic apples"
                      required
                      value={sku.name}
                    />
                    <Input
                      label="SKU ID"
                      onChange={(event) => updateSku(index, "id", event.target.value)}
                      placeholder="sku-apples"
                      required
                      value={sku.id}
                    />
                    <Select
                      label="Category"
                      onChange={(event) => updateSku(index, "categoryId", event.target.value)}
                      required
                      value={sku.categoryId}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name || category.id}
                        </option>
                      ))}
                    </Select>
                    <DraftRowActions
                      canRemove={skus.length > 1}
                      onRemove={() => removeSku(index)}
                      active={sku.active}
                      onToggle={() => updateSku(index, "active", !sku.active)}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
                    <Input
                      label="Slug"
                      onChange={(event) => updateSku(index, "slug", event.target.value)}
                      placeholder="organic-apples"
                      required
                      value={sku.slug}
                    />
                    <Select
                      label="Unit"
                      onChange={(event) => updateSku(index, "unit", event.target.value)}
                      value={sku.unit}
                    >
                      {unitOptions.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label="Image URL"
                      onChange={(event) => updateSku(index, "imageUrl", event.target.value || null)}
                      placeholder="https://..."
                      type="url"
                      value={sku.imageUrl ?? ""}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
                    <Input
                      label="Description"
                      onChange={(event) => updateSku(index, "description", event.target.value)}
                      placeholder="Crisp, sweet apples"
                      required
                      value={sku.description}
                    />
                    <Input
                      label="Procurement cost (centavos)"
                      min={0}
                      onChange={(event) =>
                        updateSku(index, "procurementCostCentavos", Number(event.target.value))
                      }
                      type="number"
                      required
                      value={sku.procurementCostCentavos}
                    />
                    <Input
                      label="Markup (basis points)"
                      min={0}
                      onChange={(event) =>
                        updateSku(index, "markupBasisPoints", Number(event.target.value))
                      }
                      type="number"
                      required
                      value={sku.markupBasisPoints}
                    />
                    <Input
                      label="Price effective"
                      onChange={(event) =>
                        updateSku(index, "priceEffectiveAt", toIso(event.target.value))
                      }
                      type="datetime-local"
                      required
                      value={toDateTimeLocal(sku.priceEffectiveAt)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </DraftSection>

          <DraftSection
            count={deliveryWindows.length}
            description="Define the active weekly delivery slots and their capacity."
            id="delivery-windows"
            onAdd={() =>
              setDeliveryWindows((current) => [
                ...current,
                createDeliveryWindowDraft(current.length),
              ])
            }
            title="Delivery windows"
          >
            <div className="grid gap-4">
              {deliveryWindows.map((window, index) => (
                <div
                  className="grid gap-3 border-b border-admin-border pb-4 last:border-0 last:pb-0"
                  key={`window-row-${index}`}
                >
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <Input
                      label="Label"
                      onChange={(event) => updateWindow(index, "label", event.target.value)}
                      placeholder="Saturday morning"
                      required
                      value={window.label}
                    />
                    <Input
                      label="Cycle ID"
                      onChange={(event) => updateWindow(index, "cycleId", event.target.value)}
                      placeholder="2026-W35"
                      required
                      value={window.cycleId}
                    />
                    <Input
                      label="Window ID"
                      onChange={(event) => updateWindow(index, "id", event.target.value)}
                      placeholder="window-sat-am"
                      required
                      value={window.id}
                    />
                    <DraftRowActions
                      canRemove={deliveryWindows.length > 1}
                      onRemove={() => removeWindow(index)}
                      active={window.active}
                      onToggle={() => updateWindow(index, "active", !window.active)}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_180px]">
                    <Input
                      label="Starts"
                      onChange={(event) =>
                        updateWindow(index, "startsAt", toIso(event.target.value))
                      }
                      type="datetime-local"
                      required
                      value={toDateTimeLocal(window.startsAt)}
                    />
                    <Input
                      label="Ends"
                      onChange={(event) => updateWindow(index, "endsAt", toIso(event.target.value))}
                      type="datetime-local"
                      required
                      value={toDateTimeLocal(window.endsAt)}
                    />
                    <Input
                      label="Capacity"
                      min={1}
                      onChange={(event) =>
                        updateWindow(index, "capacity", Number(event.target.value))
                      }
                      type="number"
                      required
                      value={window.capacity}
                    />
                  </div>
                </div>
              ))}
            </div>
          </DraftSection>

          {message ? (
            <p
              className="my-4 border-l-2 border-admin-accent bg-admin-accent-soft px-3 py-2 text-sm text-admin-text-primary"
              role="status"
            >
              {message}
            </p>
          ) : null}
          <AdminSaveBar>
            <p className="text-xs text-admin-text-secondary">
              <CalendarDays aria-hidden="true" className="mr-1 inline" size={14} />
              {idempotencyKey
                ? "Ready to apply an idempotent release."
                : "Preparing secure retry key..."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={resetDraft} size="sm" type="button" tone="secondary">
                <RotateCcw aria-hidden="true" size={14} /> Reset draft
              </Button>
              <Button disabled={busy || !idempotencyKey} loading={busy} size="sm" type="submit">
                Apply approved configuration
              </Button>
            </div>
          </AdminSaveBar>
        </form>
      </AdminPanel>
    </div>
  );

  function updateCategory(index: number, field: keyof CategoryDraft, value: string | boolean) {
    setCategories((current) =>
      current.map((category, itemIndex) =>
        itemIndex === index ? { ...category, [field]: value } : category,
      ),
    );
  }

  function updateSku(
    index: number,
    field: keyof SkuDraft,
    value: string | number | null | boolean,
  ) {
    setSkus((current) =>
      current.map((sku, itemIndex) => (itemIndex === index ? { ...sku, [field]: value } : sku)),
    );
  }

  function updateWindow(
    index: number,
    field: keyof DeliveryWindowDraft,
    value: string | number | boolean,
  ) {
    setDeliveryWindows((current) =>
      current.map((window, itemIndex) =>
        itemIndex === index ? { ...window, [field]: value } : window,
      ),
    );
  }

  function removeCategory(index: number) {
    if (categories.length <= 1) return;
    setCategories((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function removeSku(index: number) {
    if (skus.length <= 1) return;
    setSkus((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function removeWindow(index: number) {
    if (deliveryWindows.length <= 1) return;
    setDeliveryWindows((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function resetDraft() {
    setReason("");
    setCategories([createCategoryDraft()]);
    setSkus([createSkuDraft()]);
    setDeliveryWindows([createDeliveryWindowDraft()]);
    setMessage(null);
    setIdempotencyKey(crypto.randomUUID());
  }

  async function applyConfiguration(): Promise<void> {
    setBusy(true);
    setMessage(null);
    try {
      const payload: LaunchConfigurationApplyRequest = {
        reason,
        categories,
        skus,
        deliveryWindows,
      };
      const response = await client.applyLaunchConfiguration(payload, idempotencyKey);
      const { categoryCount, skuCount, deliveryWindowCount, replayed } = response.data;
      setMessage(
        `${replayed ? "Replayed" : "Applied"} ${categoryCount} categories, ${skuCount} catalog items, and ${deliveryWindowCount} delivery windows.`,
      );
      if (!replayed) setIdempotencyKey(crypto.randomUUID());
      router.refresh();
    } catch (error) {
      setMessage(formatLaunchConfigurationError(error));
    } finally {
      setBusy(false);
    }
  }
}

function DraftSection({
  count,
  description,
  id,
  onAdd,
  title,
  children,
}: Readonly<{
  count: number;
  description: string;
  id: string;
  onAdd: () => void;
  title: string;
  children: ReactNode;
}>) {
  const titleId = `${id}-title`;
  return (
    <section
      className="grid gap-4 border-b border-admin-border py-6 last:border-b-0"
      aria-labelledby={titleId}
      id={id}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-admin-text-primary" id={titleId}>
              {title}
            </h2>
            <span className="rounded border border-admin-border px-2 py-0.5 text-[10px] font-semibold text-admin-text-muted">
              {count}
            </span>
          </div>
          <p className="mt-1 text-xs text-admin-text-muted">{description}</p>
        </div>
        <Button onClick={onAdd} size="sm" type="button" tone="secondary">
          <Plus aria-hidden="true" size={14} /> Add{" "}
          {title === "Catalog items" ? "item" : title === "Categories" ? "category" : "window"}
        </Button>
      </div>
      {children}
    </section>
  );
}

function DraftRowActions({
  active,
  canRemove,
  onRemove,
  onToggle,
}: Readonly<{
  active: boolean;
  canRemove: boolean;
  onRemove: () => void;
  onToggle: () => void;
}>) {
  return (
    <div className="flex items-end gap-2 pb-0.5">
      <label className="inline-flex min-h-9 items-center gap-2 text-xs font-medium text-admin-text-primary">
        <input checked={active} onChange={onToggle} type="checkbox" /> Active
      </label>
      <button
        aria-label="Remove row"
        className="inline-grid size-9 place-items-center rounded-md border border-admin-border text-admin-text-muted hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canRemove}
        onClick={onRemove}
        title="Remove row"
        type="button"
      >
        <Trash2 aria-hidden="true" size={15} />
      </button>
    </div>
  );
}

function createCategoryDraft(index = 0): CategoryDraft {
  return { id: `category-${index + 1}`, name: "", slug: "", active: true };
}

function createSkuDraft(index = 0): SkuDraft {
  return {
    id: `sku-${index + 1}`,
    categoryId: "",
    name: "",
    slug: "",
    description: "",
    unit: "piece",
    imageUrl: null,
    procurementCostCentavos: 0,
    markupBasisPoints: 0,
    priceEffectiveAt: new Date().toISOString(),
    active: true,
  };
}

function createDeliveryWindowDraft(index = 0): DeliveryWindowDraft {
  const start = new Date();
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(12, 0, 0, 0);
  return {
    id: `window-${index + 1}`,
    cycleId: "",
    label: "",
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    capacity: 1,
    active: true,
  };
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function formatLaunchConfigurationError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return `${error.message} (${error.code}${error.correlationId ? `, ${error.correlationId}` : ""})`;
  }
  if (error instanceof Error && error.name === "ZodError") {
    return "Review the highlighted fields. The configuration does not match the launch contract.";
  }
  if (error instanceof Error) return error.message;
  return "The launch configuration could not be applied.";
}
