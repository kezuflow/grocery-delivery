"use client";

import type {
  CatalogAdminItem,
  CatalogAdminLifecycle,
  CatalogAdminListResponse,
  CatalogUnit,
} from "@carbon/contracts";
import {
  Archive,
  ArrowLeft,
  Boxes,
  Check,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import {
  Button,
  CardDescription,
  CardTitle,
  Dialog,
  EmptyState,
  Input,
  Select,
  Sheet,
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  Textarea,
} from "../../components/ui";
import type { AdminFeedState } from "../../lib/admin";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import { formatPhp } from "../../lib/format";
import type { AdminPermission } from "../../lib/permissions";

const imageLibrary = [
  ["apple.webp", "Apples"],
  ["basil.webp", "Fresh basil"],
  ["bell-peppers.webp", "Bell peppers"],
  ["broccoli.webp", "Broccoli"],
  ["carrots.webp", "Carrots"],
  ["cauliflower.webp", "Cauliflower"],
  ["chili-peppers.webp", "Chili peppers"],
  ["cucumber.webp", "Cucumber"],
  ["eggplant.webp", "Eggplant"],
  ["garlic.webp", "Garlic"],
  ["ginger.webp", "Ginger"],
  ["green-beans.webp", "Green beans"],
  ["kangkong.webp", "Kangkong"],
  ["lettuce.webp", "Lettuce"],
  ["oats.svg", "Rolled oats"],
  ["pechay.webp", "Pechay"],
  ["potatoes.webp", "Potatoes"],
  ["red-onions.webp", "Red onions"],
  ["spring-onions.webp", "Spring onions"],
  ["tomatoes.webp", "Roma tomatoes"],
  ["white-onions.webp", "White onions"],
] as const;

const units: readonly CatalogUnit[] = ["piece", "gram", "kilogram", "milliliter", "liter", "pack"];

type ProductDraft = Readonly<{
  name: string;
  description: string;
  categoryIds: readonly string[];
  unit: CatalogUnit;
  imageUrl: string | null;
  procurementCostPesos: string;
  markupPercent: string;
  status: CatalogAdminLifecycle;
}>;

export function AdminCatalog({
  catalog,
  error,
  state,
  permissions,
}: Readonly<{
  catalog: CatalogAdminListResponse["data"] | null;
  error: string | null;
  state: AdminFeedState;
  permissions: readonly AdminPermission[];
}>) {
  const router = useRouter();
  const client = createApiClient(createSameOriginApiTransport());
  const canManage =
    state.status !== "forbidden" &&
    (permissions.includes("catalog") || permissions.includes("superadmin"));
  const [view, setView] = useState<"products" | "categories" | "images">("products");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState(catalog?.categories ?? []);
  const [catalogItems, setCatalogItems] = useState(catalog?.items ?? []);
  const [catalogImages, setCatalogImages] = useState(catalog?.images ?? []);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryProductQuery, setCategoryProductQuery] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachQuery, setAttachQuery] = useState("");
  const [selectedAttachIds, setSelectedAttachIds] = useState<readonly string[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAltText, setUploadAltText] = useState("");
  const [editor, setEditor] = useState<"product" | "category" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft>(() =>
    emptyProductDraft(categories),
  );
  const [categoryName, setCategoryName] = useState("");
  const [categoryActive, setCategoryActive] = useState(true);
  const [inlineCategoryName, setInlineCategoryName] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const categoryNames = new Map(categories.map((item) => [item.id, item.name]));
  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return catalogItems.filter((item) => {
      const matchesQuery =
        !normalized ||
        `${item.name} ${item.slug} ${item.description}`.toLowerCase().includes(normalized);
      return (
        matchesQuery && (categoryFilter === "all" || item.categoryIds.includes(categoryFilter))
      );
    });
  }, [catalogItems, categoryFilter, query]);
  const selectedCategory = categories.find((item) => item.id === selectedCategoryId) ?? null;
  const categoryProducts = useMemo(() => {
    const normalized = categoryProductQuery.trim().toLowerCase();
    if (!selectedCategoryId) return [];
    return catalogItems.filter(
      (item) =>
        item.categoryIds.includes(selectedCategoryId) &&
        (!normalized ||
          `${item.name} ${item.slug} ${item.description}`.toLowerCase().includes(normalized)),
    );
  }, [catalogItems, categoryProductQuery, selectedCategoryId]);
  const attachableProducts = useMemo(() => {
    const normalized = attachQuery.trim().toLowerCase();
    if (!selectedCategoryId) return [];
    return catalogItems.filter(
      (item) =>
        !item.categoryIds.includes(selectedCategoryId) &&
        (!normalized ||
          `${item.name} ${item.slug} ${item.description}`.toLowerCase().includes(normalized)),
    );
  }, [attachQuery, catalogItems, selectedCategoryId]);
  const allImages = [
    ...catalogImages
      .filter((image) => image.status === "ready")
      .map((image) => ({ id: image.id, url: image.url, label: image.altText })),
    ...imageLibrary.map(([file, label]) => ({
      id: `built-in:${file}`,
      url: `/marketplace/${file}`,
      label,
    })),
  ];
  const visibleImages = allImages.filter((image) =>
    image.label.toLowerCase().includes(libraryQuery.trim().toLowerCase()),
  );
  const estimatedPrice = calculatePreviewPrice(productDraft);

  useEffect(() => {
    setCategories(catalog?.categories ?? []);
    setCatalogItems(catalog?.items ?? []);
    setCatalogImages(catalog?.images ?? []);
  }, [catalog]);

  return (
    <div className="grid min-w-0 gap-5">
      <section className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Catalog</CardTitle>
              <span className="rounded bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-muted">
                {catalogItems.length} products
              </span>
            </div>
            <CardDescription className="mt-1">
              Create products, organize categories, and reuse product images in one place.
            </CardDescription>
          </div>
          {canManage && !(view === "categories" && selectedCategory) ? (
            <div className="flex gap-2">
              <Button onClick={() => openCategoryEditor()} size="sm" tone="secondary">
                <Plus aria-hidden="true" size={14} /> Category
              </Button>
              <Button onClick={() => openProductEditor()} size="sm">
                <Plus aria-hidden="true" size={14} /> Add product
              </Button>
            </div>
          ) : !canManage ? (
            <StatusPill status="read only" />
          ) : null}
        </div>

        <div
          aria-label="Catalog sections"
          className="flex gap-1 border-b border-line pt-3"
          role="tablist"
        >
          {(["products", "categories", "images"] as const).map((tab) => (
            <button
              aria-selected={view === tab}
              className={`border-b-2 px-3 py-2 text-sm font-bold capitalize ${
                view === tab ? "border-deep text-deep" : "border-transparent text-muted"
              }`}
              key={tab}
              onClick={() => {
                setView(tab);
                if (tab !== "categories") setSelectedCategoryId(null);
              }}
              role="tab"
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        {state.status === "forbidden" ? (
          <Notice tone="warning">
            {state.message ?? "Catalog access is restricted for this role."}
            {state.correlationId ? ` Reference: ${state.correlationId}` : ""}
          </Notice>
        ) : error ? (
          <Notice tone="danger">{error}</Notice>
        ) : null}
        {actionMessage ? <Notice tone="success">{actionMessage}</Notice> : null}

        {view === "products" ? (
          <>
            <div className="mt-4 grid gap-3 border-b border-line pb-4 md:grid-cols-[minmax(0,1fr)_200px_auto]">
              <Input
                aria-label="Search catalog"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products"
                type="search"
                value={query}
              />
              <Select
                aria-label="Filter by category"
                onChange={(event) => setCategoryFilter(event.target.value)}
                value={categoryFilter}
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <span className="self-center text-xs text-muted">{items.length} shown</span>
            </div>
            {state.status === "unavailable" ? (
              <EmptyState description="Try again shortly." title="Catalog unavailable" />
            ) : items.length ? (
              <ProductTable
                canManage={canManage}
                categoryNames={categoryNames}
                items={items}
                onEdit={openProductEditor}
                onStatus={updateStatus}
                openMenuId={openMenuId}
                setOpenMenuId={setOpenMenuId}
              />
            ) : (
              <EmptyState
                description="Try a different search or add your first product."
                title="No matching products"
              />
            )}
          </>
        ) : view === "categories" ? (
          selectedCategory ? (
            <div className="grid gap-4 py-4">
              <button
                className="flex w-fit items-center gap-2 text-xs font-bold text-muted hover:text-deep"
                onClick={() => {
                  setSelectedCategoryId(null);
                  setCategoryProductQuery("");
                }}
                type="button"
              >
                <ArrowLeft aria-hidden="true" size={14} /> All categories
              </button>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-ink">{selectedCategory.name}</h2>
                    <StatusPill status={selectedCategory.active ? "active" : "paused"} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {categoryProducts.length}{" "}
                    {categoryProducts.length === 1 ? "product" : "products"}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => openCategoryEditor(selectedCategory.id)}
                      size="sm"
                      tone="ghost"
                    >
                      <Pencil aria-hidden="true" size={14} /> Edit category
                    </Button>
                    <Button onClick={openAttachProducts} size="sm" tone="secondary">
                      <Plus aria-hidden="true" size={14} /> Add existing
                    </Button>
                    <Button
                      onClick={() => openProductEditor(undefined, selectedCategory.id)}
                      size="sm"
                    >
                      <Plus aria-hidden="true" size={14} /> Add product
                    </Button>
                  </div>
                ) : null}
              </div>
              <Input
                aria-label={`Search products in ${selectedCategory.name}`}
                onChange={(event) => setCategoryProductQuery(event.target.value)}
                placeholder={`Search ${selectedCategory.name}`}
                type="search"
                value={categoryProductQuery}
              />
              {categoryProducts.length ? (
                <ProductTable
                  canManage={canManage}
                  categoryNames={categoryNames}
                  items={categoryProducts}
                  onEdit={openProductEditor}
                  onStatus={updateStatus}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                />
              ) : (
                <EmptyState
                  description={
                    categoryProductQuery
                      ? "Try a different search."
                      : "Create a new product here or add one that already exists."
                  }
                  title={
                    categoryProductQuery ? "No matching products" : "No products in this category"
                  }
                />
              )}
            </div>
          ) : (
            <div className="grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-3">
              {categories.map((item) => {
                const count = catalogItems.filter((product) =>
                  product.categoryIds.includes(item.id),
                ).length;
                return (
                  <article className="relative rounded-lg border border-line" key={item.id}>
                    <button
                      aria-label={`Open ${item.name}`}
                      className="w-full rounded-lg p-4 pr-12 text-left hover:bg-accent/10"
                      onClick={() => {
                        setSelectedCategoryId(item.id);
                        setCategoryProductQuery("");
                      }}
                      type="button"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <strong className="block text-sm text-ink">{item.name}</strong>
                          <span className="mt-1 block text-xs text-muted">{count} products</span>
                        </span>
                        <StatusPill status={item.active ? "active" : "paused"} />
                      </span>
                    </button>
                    {canManage ? (
                      <button
                        aria-label={`Edit ${item.name} category`}
                        className="absolute bottom-2 right-2 grid size-8 place-items-center rounded text-muted hover:bg-black/5 hover:text-ink"
                        onClick={() => openCategoryEditor(item.id)}
                        type="button"
                      >
                        <Pencil aria-hidden="true" size={14} />
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )
        ) : (
          <div className="grid gap-5 py-4">
            {canManage ? (
              <form
                className="grid gap-3 rounded-lg border border-dashed border-line bg-black/[0.02] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
                onSubmit={(event) => void uploadCatalogImage(event)}
              >
                <Input
                  accept="image/jpeg,image/png,image/webp"
                  label="Image file"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  required
                  type="file"
                />
                <Input
                  label="Image description"
                  maxLength={160}
                  onChange={(event) => setUploadAltText(event.target.value)}
                  placeholder="e.g. Roma tomatoes on white background"
                  required
                  value={uploadAltText}
                />
                <Button loading={saving} size="sm" type="submit">
                  <Upload aria-hidden="true" size={14} /> Upload image
                </Button>
                <p className="text-xs text-muted md:col-span-3">
                  JPEG, PNG, or WebP up to 5 MB. Files are stored in media storage; searchable
                  metadata is stored with the catalog.
                </p>
              </form>
            ) : null}
            {catalogImages.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {catalogImages.map((image) => (
                  <article className="overflow-hidden rounded-lg border border-line" key={image.id}>
                    <span className="grid aspect-square place-items-center bg-black/[0.03] text-muted">
                      {image.status === "ready" ? (
                        <img
                          alt={image.altText}
                          className="size-full object-cover"
                          src={image.url}
                        />
                      ) : (
                        <ImageIcon aria-hidden="true" size={24} />
                      )}
                    </span>
                    <div className="grid gap-1 p-3">
                      <strong className="truncate text-sm text-ink">{image.altText}</strong>
                      <span className="truncate text-xs text-muted">{image.fileName}</span>
                      <span className="flex items-center justify-between gap-2 pt-1 text-xs text-muted">
                        {formatFileSize(image.sizeBytes)}
                        <StatusPill status={image.status} />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Upload a product photo once, then reuse it across catalog items."
                title="No uploaded images"
              />
            )}
          </div>
        )}
      </section>

      <Sheet
        onClose={closeEditor}
        open={editor === "product"}
        title={editingId ? "Edit product" : "Add product"}
      >
        <form className="grid gap-5" onSubmit={(event) => void saveProduct(event)}>
          <EditorSection
            description="The essentials customers see in the storefront."
            title="Product details"
          >
            <Input
              label="Product name"
              onChange={(event) => patchProduct({ name: event.target.value })}
              required
              value={productDraft.name}
            />
            <Textarea
              label="Description"
              onChange={(event) => patchProduct({ description: event.target.value })}
              required
              value={productDraft.description}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <fieldset className="grid gap-2 rounded border border-line p-3">
                <legend className="px-1 text-xs font-bold text-ink">Categories</legend>
                <p className="text-xs text-muted">
                  Choose every section where this product belongs.
                </p>
                <div className="grid max-h-36 gap-2 overflow-y-auto">
                  {categories
                    .filter((item) => item.active || productDraft.categoryIds.includes(item.id))
                    .map((item) => (
                      <label className="flex items-center gap-2 text-sm text-ink" key={item.id}>
                        <input
                          checked={productDraft.categoryIds.includes(item.id)}
                          onChange={() => toggleProductCategory(item.id)}
                          type="checkbox"
                        />
                        {item.name}
                      </label>
                    ))}
                </div>
              </fieldset>
              <Select
                label="Sold by"
                onChange={(event) => patchProduct({ unit: event.target.value as CatalogUnit })}
                value={productDraft.unit}
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </div>
            <div className="rounded border border-dashed border-line bg-black/[0.02] p-3">
              <p className="text-xs font-bold text-ink">Need another category?</p>
              <div className="mt-2 flex gap-2">
                <input
                  aria-label="New category name"
                  className="min-h-9 min-w-0 flex-1 rounded border border-line px-3 text-sm"
                  onChange={(event) => setInlineCategoryName(event.target.value)}
                  placeholder="e.g. Household essentials"
                  value={inlineCategoryName}
                />
                <Button
                  disabled={!inlineCategoryName.trim() || saving}
                  onClick={() => void createInlineCategory()}
                  size="sm"
                  tone="secondary"
                  type="button"
                >
                  Create
                </Button>
              </div>
            </div>
          </EditorSection>

          <EditorSection
            description="Choose a reusable image from the existing library."
            title="Media"
          >
            <button
              className="flex items-center gap-3 rounded border border-line p-3 text-left hover:border-deep"
              onClick={() => setLibraryOpen(true)}
              type="button"
            >
              <span className="grid size-16 place-items-center overflow-hidden rounded bg-black/5 text-muted">
                {productDraft.imageUrl ? (
                  <img alt="" className="size-full object-cover" src={productDraft.imageUrl} />
                ) : (
                  <ImageIcon aria-hidden="true" size={22} />
                )}
              </span>
              <span>
                <strong className="block text-sm text-ink">
                  {productDraft.imageUrl ? "Change image" : "Choose image"}
                </strong>
                <span className="mt-1 block text-xs text-muted">
                  Search the product image library
                </span>
              </span>
            </button>
          </EditorSection>

          <EditorSection
            description="Enter familiar business values; the server calculates the selling price."
            title="Pricing"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                inputMode="decimal"
                label="Procurement cost (PHP)"
                min="0"
                onChange={(event) => patchProduct({ procurementCostPesos: event.target.value })}
                required
                step="0.01"
                type="number"
                value={productDraft.procurementCostPesos}
              />
              <Input
                inputMode="decimal"
                label="Markup (%)"
                min="0"
                onChange={(event) => patchProduct({ markupPercent: event.target.value })}
                required
                step="0.01"
                type="number"
                value={productDraft.markupPercent}
              />
            </div>
            <div className="flex items-center justify-between rounded bg-accent/20 px-3 py-2 text-sm">
              <span className="text-muted">Estimated selling price</span>
              <strong>{estimatedPrice === null ? "—" : formatPhp(estimatedPrice)}</strong>
            </div>
          </EditorSection>

          <EditorSection title="Availability">
            <Select
              label="Status"
              onChange={(event) =>
                patchProduct({ status: event.target.value as CatalogAdminLifecycle })
              }
              value={productDraft.status}
            >
              <option value="active">Active — visible to customers</option>
              <option value="paused">Paused — temporarily hidden</option>
              <option value="archived">Archived — retired from sale</option>
            </Select>
          </EditorSection>

          <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t border-line bg-white px-6 py-4">
            <Button onClick={closeEditor} size="sm" tone="ghost" type="button">
              Cancel
            </Button>
            <Button loading={saving} size="sm" type="submit">
              <Check aria-hidden="true" size={14} /> Save product
            </Button>
          </div>
        </form>
      </Sheet>

      <Sheet
        onClose={closeEditor}
        open={editor === "category"}
        title={editingId ? "Edit category" : "Add category"}
      >
        <form className="grid gap-5" onSubmit={(event) => void saveCategory(event)}>
          <EditorSection
            description="Use a customer-friendly name. Technical IDs are created automatically."
            title="Category details"
          >
            <Input
              label="Category name"
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="e.g. Fresh produce"
              required
              value={categoryName}
            />
            <Select
              label="Visibility"
              onChange={(event) => setCategoryActive(event.target.value === "active")}
              value={categoryActive ? "active" : "paused"}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </Select>
          </EditorSection>
          <div className="sticky bottom-0 -mx-6 flex justify-end gap-2 border-t border-line bg-white px-6 py-4">
            <Button onClick={closeEditor} size="sm" tone="ghost" type="button">
              Cancel
            </Button>
            <Button loading={saving} size="sm" type="submit">
              Save category
            </Button>
          </div>
        </form>
      </Sheet>

      <Dialog
        description={
          selectedCategory
            ? `Choose products to also show in ${selectedCategory.name}. Their current categories stay unchanged.`
            : "Choose products to add to this category."
        }
        onClose={closeAttachProducts}
        open={attachOpen}
        title="Add existing products"
      >
        <Input
          label="Search products"
          onChange={(event) => setAttachQuery(event.target.value)}
          placeholder="Search by product name"
          type="search"
          value={attachQuery}
        />
        {attachableProducts.length ? (
          <div className="grid max-h-[45vh] gap-2 overflow-y-auto pr-1">
            {attachableProducts.map((item) => (
              <label
                className="flex cursor-pointer items-center gap-3 rounded border border-line p-3 hover:border-deep"
                key={item.id}
              >
                <input
                  checked={selectedAttachIds.includes(item.id)}
                  onChange={() => toggleAttachProduct(item.id)}
                  type="checkbox"
                />
                <span className="min-w-0">
                  <strong className="block truncate text-sm text-ink">{item.name}</strong>
                  <span className="block truncate text-xs text-muted">
                    {formatCategoryNames(item.categoryIds, categoryNames)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="rounded bg-black/[0.03] px-3 py-4 text-sm text-muted">
            {attachQuery
              ? "No available products match this search."
              : "Every product already belongs to this category."}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button onClick={closeAttachProducts} size="sm" tone="ghost" type="button">
            Cancel
          </Button>
          <Button
            disabled={selectedAttachIds.length === 0}
            loading={saving}
            onClick={() => void attachProducts()}
            size="sm"
            type="button"
          >
            {selectedAttachIds.length
              ? `Add ${selectedAttachIds.length} ${selectedAttachIds.length === 1 ? "product" : "products"}`
              : "Add selected products"}
          </Button>
        </div>
      </Dialog>

      <Dialog
        description="Search and select an existing product image."
        onClose={() => setLibraryOpen(false)}
        open={libraryOpen}
        title="Image library"
      >
        <Input
          label="Search images"
          onChange={(event) => setLibraryQuery(event.target.value)}
          placeholder="Search by product name"
          type="search"
          value={libraryQuery}
        />
        <div className="grid max-h-[55vh] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {visibleImages.map((image) => {
            const selected = productDraft.imageUrl === image.url;
            return (
              <button
                aria-pressed={selected}
                className={`group overflow-hidden rounded border text-left ${
                  selected ? "border-deep ring-2 ring-accent" : "border-line hover:border-deep"
                }`}
                key={image.id}
                onClick={() => {
                  patchProduct({ imageUrl: image.url });
                  setLibraryOpen(false);
                }}
                type="button"
              >
                <span className="relative block aspect-square bg-black/[0.03]">
                  <img alt="" className="size-full object-cover" src={image.url} />
                  {selected ? (
                    <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-deep text-white">
                      <Check aria-hidden="true" size={12} />
                    </span>
                  ) : null}
                </span>
                <span className="block truncate px-2 py-1.5 text-[10px] font-medium text-muted">
                  {image.label}
                </span>
              </button>
            );
          })}
        </div>
      </Dialog>
    </div>
  );

  function openProductEditor(id?: string, categoryId?: string) {
    const item = id ? catalogItems.find((candidate) => candidate.id === id) : null;
    setEditingId(item?.id ?? null);
    setProductDraft(item ? draftFromItem(item) : emptyProductDraft(categories, categoryId));
    setInlineCategoryName("");
    setEditor("product");
    setOpenMenuId(null);
  }

  function openCategoryEditor(id?: string) {
    const item = id ? categories.find((candidate) => candidate.id === id) : null;
    setEditingId(item?.id ?? null);
    setCategoryName(item?.name ?? "");
    setCategoryActive(item?.active ?? true);
    setEditor("category");
  }

  function closeEditor() {
    setEditor(null);
    setEditingId(null);
  }

  function patchProduct(patch: Partial<ProductDraft>) {
    setProductDraft((current) => ({ ...current, ...patch }));
  }

  function toggleProductCategory(categoryId: string) {
    setProductDraft((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter((id) => id !== categoryId)
        : [...current.categoryIds, categoryId],
    }));
  }

  function openAttachProducts() {
    setAttachQuery("");
    setSelectedAttachIds([]);
    setAttachOpen(true);
  }

  function closeAttachProducts() {
    setAttachOpen(false);
    setAttachQuery("");
    setSelectedAttachIds([]);
  }

  function toggleAttachProduct(itemId: string) {
    setSelectedAttachIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  }

  async function attachProducts() {
    if (!selectedCategory || selectedAttachIds.length === 0) return;
    setSaving(true);
    setActionMessage(null);
    try {
      const response = await client.assignAdminCatalogCategoryItems(
        selectedCategory.id,
        { itemIds: selectedAttachIds },
        crypto.randomUUID(),
      );
      const assignedItems = new Map(response.data.items.map((item) => [item.id, item]));
      setCatalogItems((current) => current.map((item) => assignedItems.get(item.id) ?? item));
      setActionMessage(
        `${response.data.items.length} ${response.data.items.length === 1 ? "product" : "products"} added to ${selectedCategory.name}.`,
      );
      closeAttachProducts();
      router.refresh();
    } catch (error) {
      setActionMessage(formatApiError(error, "The selected products could not be added."));
    } finally {
      setSaving(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const procurementCostCentavos = pesosToCentavos(productDraft.procurementCostPesos);
    const markupBasisPoints = percentToBasisPoints(productDraft.markupPercent);
    if (procurementCostCentavos === null || markupBasisPoints === null) {
      setActionMessage("Enter a valid procurement cost and markup.");
      return;
    }
    if (productDraft.categoryIds.length === 0) {
      setActionMessage("Select at least one category.");
      return;
    }
    setSaving(true);
    setActionMessage(null);
    try {
      const response = await client.upsertAdminCatalogItem(
        editingId,
        {
          name: productDraft.name,
          description: productDraft.description,
          categoryIds: productDraft.categoryIds,
          unit: productDraft.unit,
          imageUrl: productDraft.imageUrl,
          status: productDraft.status,
          procurementCostCentavos,
          markupBasisPoints,
        },
        crypto.randomUUID(),
      );
      setCatalogItems((current) =>
        [...current.filter((item) => item.id !== response.data.item.id), response.data.item].sort(
          (left, right) => left.name.localeCompare(right.name),
        ),
      );
      setActionMessage(editingId ? "Product changes saved." : "Product created.");
      closeEditor();
      router.refresh();
    } catch (error) {
      setActionMessage(formatApiError(error, "The product could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setActionMessage(null);
    try {
      const response = await client.upsertAdminCatalogCategory(
        editingId,
        { name: categoryName, active: categoryActive },
        crypto.randomUUID(),
      );
      setCategories((current) =>
        [
          ...current.filter((item) => item.id !== response.data.category.id),
          response.data.category,
        ].sort((left, right) => left.name.localeCompare(right.name)),
      );
      setActionMessage(editingId ? "Category changes saved." : "Category created.");
      closeEditor();
      router.refresh();
    } catch (error) {
      setActionMessage(formatApiError(error, "The category could not be saved."));
    } finally {
      setSaving(false);
    }
  }

  async function createInlineCategory() {
    setSaving(true);
    setActionMessage(null);
    try {
      const response = await client.upsertAdminCatalogCategory(
        null,
        { name: inlineCategoryName, active: true },
        crypto.randomUUID(),
      );
      const created = response.data.category;
      setCategories((current) =>
        [...current, created].sort((left, right) => left.name.localeCompare(right.name)),
      );
      patchProduct({ categoryIds: [...productDraft.categoryIds, created.id] });
      setInlineCategoryName("");
      setActionMessage(`${created.name} created and selected.`);
    } catch (error) {
      setActionMessage(formatApiError(error, "The category could not be created."));
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: CatalogAdminLifecycle, itemName: string) {
    setSaving(true);
    setOpenMenuId(null);
    setActionMessage(null);
    try {
      await client.updateAdminCatalogStatus(id, status);
      setActionMessage(`${itemName} is now ${status}.`);
      router.refresh();
    } catch (error) {
      setActionMessage(formatApiError(error, "The catalog status could not be updated."));
    } finally {
      setSaving(false);
    }
  }

  async function uploadCatalogImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uploadFile) return;
    setSaving(true);
    setActionMessage(null);
    try {
      const created = await client.createAdminCatalogImageUpload(
        {
          fileName: uploadFile.name,
          altText: uploadAltText,
          contentType: uploadFile.type,
          sizeBytes: uploadFile.size,
        },
        crypto.randomUUID(),
      );
      const uploaded = await fetch(created.data.uploadUrl, {
        method: "PUT",
        headers: { "content-type": uploadFile.type },
        body: uploadFile,
      });
      if (!uploaded.ok) throw new Error("The image bytes could not be uploaded.");
      const completed = await client.completeAdminCatalogImage(created.data.image.id);
      setCatalogImages((current) => [
        completed.data.image,
        ...current.filter((image) => image.id !== completed.data.image.id),
      ]);
      setUploadFile(null);
      setUploadAltText("");
      setActionMessage("Image uploaded and ready to use.");
      router.refresh();
    } catch (error) {
      setActionMessage(formatApiError(error, "The image could not be uploaded."));
    } finally {
      setSaving(false);
    }
  }
}

function ProductTable({
  canManage,
  categoryNames,
  items,
  onEdit,
  onStatus,
  openMenuId,
  setOpenMenuId,
}: Readonly<{
  canManage: boolean;
  categoryNames: ReadonlyMap<string, string>;
  items: readonly CatalogAdminItem[];
  onEdit: (id: string) => void;
  onStatus: (id: string, status: CatalogAdminLifecycle, name: string) => Promise<void>;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
}>) {
  return (
    <>
      <div className="grid gap-2 py-4 md:hidden">
        {items.map((item) => {
          const imageUrl = item.imageUrl ?? localImageFor(item.slug);
          return (
            <button
              aria-label={`${canManage ? "Edit" : "View"} ${item.name}`}
              className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-line bg-white p-3 text-left"
              key={item.id}
              onClick={() => onEdit(item.id)}
              type="button"
            >
              <span className="grid size-12 place-items-center overflow-hidden rounded bg-black/[0.03] text-muted">
                {imageUrl ? (
                  <img alt="" className="size-full object-cover" src={imageUrl} />
                ) : (
                  <ImageIcon aria-hidden="true" size={17} />
                )}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm text-ink">{item.name}</strong>
                <span className="mt-1 block truncate text-xs text-muted">
                  {formatCategoryNames(item.categoryIds, categoryNames)} · {item.unit}
                </span>
                <span className="mt-1 block text-sm font-bold text-ink">
                  {formatPhp(item.price.centavos)}
                </span>
              </span>
              <StatusPill status={item.status} />
            </button>
          );
        })}
      </div>
      <Table wrapperClassName="mt-4 hidden rounded-none border-x-0 border-t-0 md:block">
        <TableHeader>
          <tr>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Category</TableHeaderCell>
            <TableHeaderCell>Price</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>
              <span className="sr-only">Actions</span>
            </TableHeaderCell>
          </tr>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const imageUrl = item.imageUrl ?? localImageFor(item.slug);
            return (
              <tr
                className="group cursor-pointer hover:bg-black/[0.02]"
                key={item.id}
                onClick={() => onEdit(item.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded border border-line bg-black/[0.03] text-muted">
                      {imageUrl ? (
                        <img alt="" className="size-full object-cover" src={imageUrl} />
                      ) : (
                        <ImageIcon aria-hidden="true" size={15} />
                      )}
                    </span>
                    <span className="min-w-0">
                      <strong className="block text-ink">{item.name}</strong>
                      <span className="block truncate text-[11px] text-muted">{item.unit}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatCategoryNames(item.categoryIds, categoryNames)}</TableCell>
                <TableCell className="font-semibold">{formatPhp(item.price.centavos)}</TableCell>
                <TableCell>
                  <StatusPill status={item.status} />
                </TableCell>
                <TableCell className="relative text-right">
                  <button
                    aria-expanded={openMenuId === item.id}
                    aria-label={`Actions for ${item.name}`}
                    className="inline-grid size-8 place-items-center rounded text-muted hover:bg-black/5 hover:text-ink"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(openMenuId === item.id ? null : item.id);
                    }}
                    type="button"
                  >
                    <MoreHorizontal aria-hidden="true" size={17} />
                  </button>
                  {openMenuId === item.id ? (
                    <div className="absolute right-3 top-11 z-20 min-w-40 rounded border border-line bg-white p-1 text-left shadow-lg">
                      <MenuButton
                        icon={<Pencil size={14} />}
                        label={canManage ? "Edit product" : "View details"}
                        onClick={() => onEdit(item.id)}
                      />
                      {canManage && item.status !== "active" ? (
                        <MenuButton
                          icon={<Check size={14} />}
                          label="Activate"
                          onClick={() => void onStatus(item.id, "active", item.name)}
                        />
                      ) : null}
                      {canManage && item.status === "active" ? (
                        <MenuButton
                          icon={<Boxes size={14} />}
                          label="Pause"
                          onClick={() => void onStatus(item.id, "paused", item.name)}
                        />
                      ) : null}
                      {canManage && item.status !== "archived" ? (
                        <MenuButton
                          danger
                          icon={<Archive size={14} />}
                          label="Archive"
                          onClick={() => void onStatus(item.id, "archived", item.name)}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </TableCell>
              </tr>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}

function EditorSection({
  title,
  description,
  children,
}: Readonly<{ title: string; description?: string; children: ReactNode }>) {
  return (
    <section className="grid gap-3 rounded-lg border border-line p-4">
      <header>
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: Readonly<{ icon: ReactNode; label: string; onClick: () => void; danger?: boolean }>) {
  return (
    <button
      className={`flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs font-medium hover:bg-black/5 ${
        danger ? "text-red-700" : "text-ink"
      }`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      type="button"
    >
      {icon} {label}
    </button>
  );
}

function Notice({
  children,
  tone,
}: Readonly<{ children: ReactNode; tone: "success" | "warning" | "danger" }>) {
  const classes =
    tone === "success"
      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-400 bg-amber-50 text-amber-800"
        : "border-red-400 bg-red-50 text-red-700";
  return (
    <p
      className={`mt-3 border-l-2 px-3 py-2 text-xs ${classes}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

function emptyProductDraft(
  categories: CatalogAdminListResponse["data"]["categories"],
  categoryId?: string,
): ProductDraft {
  const preferredCategory =
    categories.find((item) => item.id === categoryId) ?? categories.find((item) => item.active);
  return {
    name: "",
    description: "",
    categoryIds: preferredCategory ? [preferredCategory.id] : [],
    unit: "piece",
    imageUrl: null,
    procurementCostPesos: "",
    markupPercent: "",
    status: "active",
  };
}

function draftFromItem(item: CatalogAdminItem): ProductDraft {
  return {
    name: item.name,
    description: item.description,
    categoryIds: item.categoryIds,
    unit: item.unit,
    imageUrl: item.imageUrl,
    procurementCostPesos: (item.procurementCostCentavos / 100).toFixed(2),
    markupPercent: (item.markupBasisPoints / 100).toFixed(2),
    status: item.status,
  };
}

function formatCategoryNames(
  categoryIds: readonly string[],
  categoryNames: ReadonlyMap<string, string>,
): string {
  const names = categoryIds.flatMap((id) => {
    const name = categoryNames.get(id);
    return name ? [name] : [];
  });
  return names.length ? names.join(", ") : "Uncategorized";
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function pesosToCentavos(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

export function percentToBasisPoints(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

function calculatePreviewPrice(draft: ProductDraft): number | null {
  const cost = pesosToCentavos(draft.procurementCostPesos);
  const markup = percentToBasisPoints(draft.markupPercent);
  if (cost === null || markup === null) return null;
  return Math.floor((cost * (10_000 + markup) + 5_000) / 10_000);
}

function formatApiError(error: unknown, fallback: string) {
  return error instanceof ApiClientError
    ? `${error.message}${error.correlationId ? ` (reference ${error.correlationId})` : ""}`
    : fallback;
}

function localImageFor(slug: string) {
  const normalized = slug.replace(/-?tomatoes$/, "tomatoes");
  const filename = normalized === "rolled-oats" ? "oats.svg" : `${normalized}.webp`;
  return imageLibrary.some(([file]) => file === filename) ? `/marketplace/${filename}` : null;
}
