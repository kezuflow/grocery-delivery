"use client";

import type { CatalogListResponse } from "@carbon/contracts";
import {
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Pause,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  CardDescription,
  CardTitle,
  Dialog,
  EmptyState,
  LinkButton,
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
} from "../../components/ui";
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

export function AdminCatalog({
  catalog,
  error,
  permissions,
}: Readonly<{
  catalog: CatalogListResponse["data"] | null;
  error: string | null;
  permissions: readonly AdminPermission[];
}>) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [draftImage, setDraftImage] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const canConfigure = permissions.includes("superadmin");
  const categoryNames = new Map(catalog?.categories.map((item) => [item.id, item.name]));
  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (catalog?.items ?? []).filter((item) => {
      const matchesQuery =
        !normalized ||
        `${item.name} ${item.slug} ${item.description}`.toLowerCase().includes(normalized);
      return matchesQuery && (category === "all" || item.categoryId === category);
    });
  }, [catalog?.items, category, query]);
  const selected = catalog?.items.find((item) => item.id === selectedId) ?? null;
  const selectedImage =
    draftImage ?? selected?.imageUrl ?? (selected ? localImageFor(selected.slug) : null);

  return (
    <div className="grid gap-5">
      <section>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#dedede] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Catalog items</CardTitle>
              <span className="rounded bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-semibold text-[#666]">
                {catalog?.items.length ?? 0} rows
              </span>
            </div>
            <CardDescription className="mt-1">
              Search, inspect, and prepare server-owned catalog changes.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {canConfigure ? (
              <LinkButton href="/admin/configuration" size="sm">
                Open editor
              </LinkButton>
            ) : (
              <StatusPill status="read only" />
            )}
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-[#d8d8d8] px-3 text-xs font-semibold text-[#444] hover:bg-[#f4f4f4]"
              onClick={() => setLibraryOpen(true)}
              type="button"
            >
              <ImageIcon aria-hidden="true" size={14} /> Image library
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 border-b border-[#dedede] pb-4 md:grid-cols-[minmax(0,1fr)_190px_auto]">
          <label className="relative block">
            <span className="sr-only">Search catalog</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#888]"
              size={15}
            />
            <input
              className="h-9 w-full rounded-md border border-[#d8d8d8] bg-white pl-9 pr-3 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, SKU, or description"
              type="search"
              value={query}
            />
          </label>
          <label className="relative block">
            <span className="sr-only">Filter by category</span>
            <SlidersHorizontal
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#888]"
              size={14}
            />
            <select
              className="h-9 w-full appearance-none rounded-md border border-[#d8d8d8] bg-white pl-9 pr-3 text-xs outline-none focus:border-emerald-500"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              <option value="all">All categories</option>
              {catalog?.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <span className="self-center text-[11px] text-[#777]">{items.length} shown</span>
        </div>
        {error ? (
          <p
            className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {actionMessage ? (
          <p
            className="mt-3 border-l-2 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
            role="status"
          >
            {actionMessage}
          </p>
        ) : null}
        {items.length ? (
          <Table wrapperClassName="mt-4 rounded-none border-x-0 border-t-0">
            <TableHeader>
              <tr>
                <TableHeaderCell>Item</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Unit</TableHeaderCell>
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
                    className="group cursor-pointer hover:bg-[#fbfbfb]"
                    key={item.id}
                    onClick={() => {
                      setSelectedId(item.id);
                      setDraftImage(item.imageUrl);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded border border-[#e4e4e4] bg-[#fafafa] text-[#aaa]">
                          {imageUrl ? (
                            <img alt="" className="size-full object-cover" src={imageUrl} />
                          ) : (
                            <ImageIcon aria-hidden="true" size={15} />
                          )}
                        </span>
                        <span className="min-w-0">
                          <strong className="block text-[#222]">{item.name}</strong>
                          <span className="mt-0.5 block max-w-[25rem] truncate text-[11px] text-[#888]">
                            {item.slug}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{categoryNames.get(item.categoryId) ?? "Uncategorized"}</TableCell>
                    <TableCell className="capitalize">{item.unit}</TableCell>
                    <TableCell className="font-semibold">
                      {formatPhp(item.price.centavos)}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={item.active ? "active" : "inactive"} />
                    </TableCell>
                    <TableCell className="relative text-right">
                      <button
                        aria-expanded={openMenuId === item.id}
                        aria-label={`Actions for ${item.name}`}
                        className="inline-grid size-8 place-items-center rounded-md text-[#777] hover:bg-[#ededed] hover:text-[#222] focus-visible:outline-2 focus-visible:outline-emerald-600"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuId((current) => (current === item.id ? null : item.id));
                        }}
                        title="More actions"
                        type="button"
                      >
                        <MoreHorizontal aria-hidden="true" size={17} />
                      </button>
                      {openMenuId === item.id ? (
                        <div className="absolute right-3 top-11 z-20 min-w-36 overflow-hidden rounded-md border border-[#d8d8d8] bg-white p-1 text-left shadow-lg">
                          <button
                            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs font-medium text-[#333] hover:bg-[#f2f2f2]"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(item.id);
                              setDraftImage(item.imageUrl);
                              setOpenMenuId(null);
                            }}
                            type="button"
                          >
                            <Pencil aria-hidden="true" size={14} /> Edit
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs font-medium text-[#333] hover:bg-[#f2f2f2]"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActionMessage(
                                `Pause ${item.name} through the server-owned launch configuration.`,
                              );
                              setOpenMenuId(null);
                            }}
                            type="button"
                          >
                            <Pause aria-hidden="true" size={14} /> Pause
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActionMessage(
                                `Delete ${item.name} through the server-owned launch configuration.`,
                              );
                              setOpenMenuId(null);
                            }}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={14} /> Delete
                          </button>
                        </div>
                      ) : null}
                    </TableCell>
                  </tr>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            description="Try a different search or category filter."
            title="No matching catalog items"
          />
        )}
      </section>

      <Dialog
        description="Local image preview and library selection. Persisting a catalog image still requires the approved server configuration workflow."
        onClose={() => setSelectedId(null)}
        open={Boolean(selected)}
        title={selected ? selected.name : "Catalog item"}
      >
        {selected ? (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
              <div className="grid aspect-square place-items-center overflow-hidden rounded-md border border-[#e4e4e4] bg-[#fafafa]">
                {selectedImage ? (
                  <img alt={selected.name} className="size-full object-cover" src={selectedImage} />
                ) : (
                  <ImageIcon aria-hidden="true" className="text-[#aaa]" size={28} />
                )}
              </div>
              <dl className="grid content-start gap-2 text-xs">
                <div className="flex justify-between gap-3 border-b border-[#ededed] pb-2">
                  <dt className="text-[#777]">SKU</dt>
                  <dd className="font-medium text-[#333]">{selected.id}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[#ededed] pb-2">
                  <dt className="text-[#777]">Category</dt>
                  <dd className="font-medium text-[#333]">
                    {categoryNames.get(selected.categoryId) ?? "Uncategorized"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-[#ededed] pb-2">
                  <dt className="text-[#777]">Price</dt>
                  <dd className="font-medium text-[#333]">{formatPhp(selected.price.centavos)}</dd>
                </div>
                <div>
                  <dt className="text-[#777]">Description</dt>
                  <dd className="mt-1 leading-5 text-[#444]">{selected.description}</dd>
                </div>
              </dl>
            </div>
            <div className="grid gap-2 border-t border-[#ededed] pt-4">
              <p className="text-xs font-semibold text-[#333]">Product image</p>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#171717] px-3 py-2 text-xs font-semibold text-white hover:bg-[#333]">
                  <Upload aria-hidden="true" size={14} /> Upload image
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) setDraftImage(URL.createObjectURL(file));
                    }}
                    type="file"
                  />
                </label>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-[#d8d8d8] px-3 py-2 text-xs font-semibold text-[#444] hover:bg-[#f4f4f4]"
                  onClick={() => setLibraryOpen(true)}
                  type="button"
                >
                  <ImageIcon aria-hidden="true" size={14} /> Choose from library
                </button>
                {draftImage ? (
                  <button
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                    onClick={() => setDraftImage(null)}
                    type="button"
                  >
                    <X aria-hidden="true" size={14} /> Remove preview
                  </button>
                ) : null}
              </div>
            </div>
            {canConfigure ? (
              <LinkButton href="/admin/configuration" size="sm" tone="secondary">
                Edit server manifest
              </LinkButton>
            ) : (
              <p className="text-[11px] leading-4 text-[#777]">
                Catalog edits are permission-protected and applied through the server-owned launch
                manifest.
              </p>
            )}
          </div>
        ) : null}
      </Dialog>

      <Dialog
        description="Select an existing local product image for the current preview."
        onClose={() => setLibraryOpen(false)}
        open={libraryOpen}
        title="Image library"
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {imageLibrary.map(([file, label]) => (
            <button
              className="group overflow-hidden rounded-md border border-[#e4e4e4] text-left hover:border-emerald-500"
              key={file}
              onClick={() => {
                setDraftImage(`/marketplace/${file}`);
                setLibraryOpen(false);
              }}
              type="button"
            >
              <span className="block aspect-square bg-[#fafafa]">
                <img alt="" className="size-full object-cover" src={`/marketplace/${file}`} />
              </span>
              <span className="block truncate px-2 py-1.5 text-[10px] font-medium text-[#555]">
                {label}
              </span>
            </button>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

function localImageFor(slug: string) {
  const normalized = slug.replace(/-?tomatoes$/, "tomatoes");
  const filename = normalized === "rolled-oats" ? "oats.svg" : `${normalized}.webp`;
  return imageLibrary.some(([file]) => file === filename) ? `/marketplace/${filename}` : null;
}
