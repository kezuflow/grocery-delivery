"use client";

import { useState } from "react";

import type { DeliveryAddressesResponse } from "@carbon/contracts";

import { createApiClient, createSameOriginApiTransport } from "../../lib/api/client";

type Address = DeliveryAddressesResponse["data"]["addresses"][number];

export function DeliveryAddressBook({
  initialAddresses,
}: Readonly<{ initialAddresses: readonly Address[] }>) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const client = createApiClient(createSameOriginApiTransport());

  async function select(id: string) {
    setBusy(id);
    setMessage(null);
    try {
      const result = await client.selectDeliveryAddress(id);
      setAddresses((current) =>
        current.map((address) => ({ ...address, selected: address.id === result.data.id })),
      );
      setMessage("Selected address updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Address selection failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="account-address-book">
      {addresses.length === 0 ? <p>No saved addresses yet.</p> : null}
      {addresses.map((address) => (
        <article key={address.id} className="account-address-card">
          <div>
            <strong>{address.recipientName}</strong>
            <p>
              {address.line1}, {address.barangay}, {address.city}, {address.province}{" "}
              {address.postalCode}
            </p>
            <small>{address.serviceable ? "Delivery available" : "Delivery unavailable"}</small>
          </div>
          {address.selected ? (
            <span>Selected</span>
          ) : (
            <button type="button" disabled={busy !== null} onClick={() => void select(address.id)}>
              {busy === address.id ? "Selecting..." : "Use this address"}
            </button>
          )}
        </article>
      ))}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
