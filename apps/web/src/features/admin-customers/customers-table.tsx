"use client";

import { useMemo, useState } from "react";
import type { AdminCustomersResponse } from "@carbon/contracts";
import {
  AdminInput,
  AdminStatus,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
} from "../../components/ui";

type Customer = AdminCustomersResponse["data"]["customers"][number];

export function CustomersTable({ customers }: Readonly<{ customers: readonly Customer[] }>) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      `${customer.name} ${customer.email}`.toLowerCase().includes(term),
    );
  }, [customers, query]);

  return (
    <>
      <div className="border-b border-admin-border bg-admin-surface-subtle px-4 py-3">
        <AdminInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search customers"
        />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <tr>
              <TableHeaderCell>Customer</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Verification</TableHeaderCell>
              <TableHeaderCell>Joined</TableHeaderCell>
              <TableHeaderCell>Updated</TableHeaderCell>
            </tr>
          </TableHeader>
          <TableBody>
            {visible.map((customer) => (
              <tr
                key={customer.id}
                className="border-b border-admin-border last:border-0 hover:bg-admin-surface-subtle"
              >
                <TableCell>
                  <div className="font-medium text-admin-text">{customer.name}</div>
                  <div className="mt-0.5 text-xs text-admin-text-muted">{customer.id}</div>
                </TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>
                  <AdminStatus status={customer.emailVerified ? "verified" : "unverified"} />
                </TableCell>
                <TableCell>
                  {new Date(customer.createdAt).toLocaleDateString("en-PH", {
                    dateStyle: "medium",
                  })}
                </TableCell>
                <TableCell>
                  {new Date(customer.updatedAt).toLocaleDateString("en-PH", {
                    dateStyle: "medium",
                  })}
                </TableCell>
              </tr>
            ))}
          </TableBody>
        </Table>
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-sm text-admin-text-muted">No customers match this search.</p>
        ) : null}
      </div>
    </>
  );
}
