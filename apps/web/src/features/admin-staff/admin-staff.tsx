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
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  StatusPill,
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
      <Card>
        <CardHeader>
          <CardTitle>Assign server-owned role</CardTitle>
          <CardDescription>
            Only superadmins can grant authority. The API validates and audits every assignment.
          </CardDescription>
        </CardHeader>
        <form
          className="grid gap-4"
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
          <fieldset className="grid gap-2">
            <legend className="text-sm font-bold">Administrator permissions</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {permissionOptions.map((permission) => (
                <label className="flex items-center gap-2 text-sm" key={permission}>
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
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent authority changes</CardTitle>
          <CardDescription>
            Audit events are the server-backed staff history until a directory read endpoint is
            available.
          </CardDescription>
        </CardHeader>
        {data.error ? (
          <p className="text-sm text-danger" role="alert">
            {data.error}
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
                    <StatusPill status="recorded" />
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
      </Card>
    </div>
  );
}
