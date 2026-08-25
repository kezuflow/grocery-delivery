"use client";

import { useState } from "react";

import type { AdminPermission } from "../../lib/permissions";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import type { AdminStaffData } from "../../lib/admin-product";
import {
  AdminButton as Button,
  AdminInput as Input,
  AdminPanel,
  AdminPanelHeader,
  AdminSelect as Select,
  AdminStatus,
} from "../../components/ui";

const permissionOptions: readonly AdminPermission[] = [
  "catalog",
  "pricing",
  "marketing",
  "finance",
  "procurement",
  "packing",
  "dispatch",
  "support",
  "reporting",
  "staff",
];

export function AdminStaff({ data }: Readonly<{ data: AdminStaffData }>) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const client = createApiClient(createSameOriginApiTransport());

  async function assignRole(form: HTMLFormElement) {
    const values = new FormData(form);
    const userIdValue = values.get("userId");
    const roleValue = values.get("role");
    const userId = (typeof userIdValue === "string" ? userIdValue : "").trim();
    const role = (typeof roleValue === "string" ? roleValue : "admin") as
      "admin" | "customer" | "deliveryman";
    const adminPermissions = values.getAll("adminPermissions").map(String);
    if (!userId) return;
    if (!window.confirm(`Assign the ${role} role to ${userId}? This changes server authority.`))
      return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await client.assignAdminRole({ userId, role, adminPermissions });
      setMessage(`Role assigned. MFA required: ${response.data.mfaRequired ? "yes" : "no"}.`);
      form.reset();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "The role assignment could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.7fr)]">
      <AdminPanel>
        <AdminPanelHeader
          description="Only superadmins can grant authority. The API validates and audits every assignment."
          title="Assign server-owned role"
        />
        <form
          className="grid gap-4 p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void assignRole(event.currentTarget);
          }}
        >
          <Input label="User ID" name="userId" placeholder="user_..." required />
          <Select label="Role" name="role" defaultValue="admin">
            <option value="admin">Administrator</option>
            <option value="deliveryman">Delivery staff</option>
            <option value="customer">Customer</option>
          </Select>
          <fieldset className="grid gap-2 border-t border-admin-border pt-4">
            <legend className="text-xs font-semibold text-admin-text-primary">
              Administrator permissions
            </legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {permissionOptions.map((permission) => (
                <label
                  className="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm text-admin-text-secondary hover:bg-admin-surface-hover"
                  key={permission}
                >
                  <input name="adminPermissions" type="checkbox" value={permission} />
                  {permission}
                </label>
              ))}
            </div>
          </fieldset>
          <Button disabled={busy} type="submit">
            {busy ? "Saving..." : "Assign role"}
          </Button>
          {message ? (
            <p className="text-sm text-muted" role="status">
              {message}
            </p>
          ) : null}
        </form>
      </AdminPanel>
      <AdminPanel>
        <AdminPanelHeader
          description="Audit events are the server-backed staff history until a directory read endpoint is available."
          title="Recent authority changes"
        />
        <div className="p-4 sm:p-5">
          {data.state.status === "forbidden" ? (
            <p className="text-sm text-muted" role="status">
              Audit activity access is restricted for this role.
            </p>
          ) : data.error ? (
            <p className="text-sm text-danger" role="alert">
              {data.error}
              {data.state.correlationId ? ` Reference ${data.state.correlationId}.` : ""}
            </p>
          ) : data.auditEvents.length ? (
            <ul className="grid gap-3 text-sm">
              {data.auditEvents
                .filter((event) => event.action.includes("identity") || event.targetType === "user")
                .slice(0, 8)
                .map((event) => (
                  <li className="border-b border-line pb-3 last:border-0" key={event.id}>
                    <div className="flex items-center justify-between gap-3">
                      <strong>{event.action}</strong>
                      <AdminStatus status="recorded" />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {event.targetId ?? "No target"} ·{" "}
                      {new Date(event.occurredAt).toLocaleString("en-PH")}
                    </p>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No staff audit events are available.</p>
          )}
        </div>
      </AdminPanel>
    </div>
  );
}
