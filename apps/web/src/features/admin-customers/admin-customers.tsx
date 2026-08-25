import { AdminEmptyState, AdminErrorState, AdminPanel, AdminStatus } from "../../components/ui";
import type { AdminCustomersData } from "../../lib/admin-product";
import { CustomersTable } from "./customers-table";

export function AdminCustomers({ customers, state, error }: AdminCustomersData) {
  if (state.status === "forbidden") {
    return (
      <AdminErrorState
        title="Customer access is restricted"
        description={state.message ?? "Support permission is required to view customers."}
      />
    );
  }
  if (error && state.status === "unavailable") {
    return <AdminErrorState title="Customers are unavailable" description={error} />;
  }
  return (
    <div className="grid min-w-0 gap-5">
      <AdminPanel>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-admin-text">Customer directory</p>
            <p className="mt-1 text-xs text-admin-text-muted">
              Support-facing identity records, ordered by signup date.
            </p>
          </div>
          <AdminStatus status={`${customers.length} visible`} />
        </div>
        {state.status === "empty" ? (
          <AdminEmptyState
            title="No customers yet"
            description="Customer accounts will appear here after signup."
          />
        ) : (
          <CustomersTable customers={customers} />
        )}
      </AdminPanel>
    </div>
  );
}
