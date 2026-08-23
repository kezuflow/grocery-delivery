import type { CatalogListResponse } from "@carbon/contracts";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
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

export function AdminCatalog({
  catalog,
  error,
  permissions,
}: Readonly<{
  catalog: CatalogListResponse["data"] | null;
  error: string | null;
  permissions: readonly AdminPermission[];
}>) {
  const canConfigure = permissions.includes("superadmin");
  const categoryNames = new Map(
    catalog?.categories.map((category) => [category.id, category.name]),
  );
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Catalog control</CardTitle>
          <CardDescription>
            Review the active server catalog. Prices, visibility, and availability are resolved by
            the API; launch configuration is the approved write path.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          {canConfigure ? (
            <LinkButton href="/admin/configuration" size="sm">
              Open launch configuration
            </LinkButton>
          ) : (
            <StatusPill status="read only" />
          )}
          <span className="text-sm text-muted">
            {catalog
              ? `${catalog.items.length} items · ${catalog.categories.length} categories`
              : "Catalog unavailable"}
          </span>
        </div>
      </Card>
      {!canConfigure ? (
        <p className="border border-line bg-white p-4 text-sm text-muted" role="status">
          You can review catalog and pricing state. Applying a launch manifest requires superadmin
          permission and is enforced by the API.
        </p>
      ) : null}
      {error ? (
        <p className="border border-danger/40 bg-danger/10 p-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {catalog?.items.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Active catalog items</CardTitle>
            <CardDescription>
              Server-confirmed prices and visibility for the current market.
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <tr>
                <TableHeaderCell>Item</TableHeaderCell>
                <TableHeaderCell>Category</TableHeaderCell>
                <TableHeaderCell>Unit</TableHeaderCell>
                <TableHeaderCell>Price</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {catalog.items.map((item) => (
                <tr key={item.id}>
                  <TableCell>
                    <strong>{item.name}</strong>
                    <p className="mt-1 max-w-[28rem] text-xs text-muted">{item.description}</p>
                  </TableCell>
                  <TableCell>{categoryNames.get(item.categoryId) ?? "Uncategorized"}</TableCell>
                  <TableCell className="capitalize">{item.unit}</TableCell>
                  <TableCell className="font-bold">{formatPhp(item.price.centavos)}</TableCell>
                  <TableCell>
                    <StatusPill status={item.active ? "active" : "inactive"} />
                  </TableCell>
                </tr>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <EmptyState
          description="Publish an approved launch manifest to make categories and SKUs available."
          title="No active catalog"
        />
      )}
    </div>
  );
}
