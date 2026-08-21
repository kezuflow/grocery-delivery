"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DeliveryAddressResponse } from "@carbon/contracts";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

type Address = NonNullable<DeliveryAddressResponse["data"]>;
type FormState = Omit<Address, "createdAt" | "updatedAt" | "serviceable">;

const emptyForm: FormState = {
  recipientName: "",
  phone: "",
  line1: "",
  line2: null,
  barangay: "",
  city: "",
  province: "",
  postalCode: "",
  instructions: null,
};

export function DeliveryAddressEditor({
  initialAddress,
}: Readonly<{ initialAddress: DeliveryAddressResponse["data"] }>) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() =>
    initialAddress
      ? {
          recipientName: initialAddress.recipientName,
          phone: initialAddress.phone,
          line1: initialAddress.line1,
          line2: initialAddress.line2,
          barangay: initialAddress.barangay,
          city: initialAddress.city,
          province: initialAddress.province,
          postalCode: initialAddress.postalCode,
          instructions: initialAddress.instructions,
        }
      : emptyForm,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: field === "line2" || field === "instructions" ? value || null : value,
    }));
  }

  return (
    <div className="delivery-address-editor">
      {initialAddress ? (
        <p
          className={`subscription-note${initialAddress.serviceable ? "" : " order-message-error"}`}
        >
          {initialAddress.serviceable
            ? "This address is currently within our delivery area."
            : "This address is outside the current delivery area."}
        </p>
      ) : null}
      <div className="address-form-grid">
        <label>
          Recipient name
          <input
            value={form.recipientName}
            onChange={(event) => update("recipientName", event.target.value)}
          />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
        </label>
        <label className="address-form-wide">
          Address line 1
          <input value={form.line1} onChange={(event) => update("line1", event.target.value)} />
        </label>
        <label className="address-form-wide">
          Address line 2
          <input
            value={form.line2 ?? ""}
            onChange={(event) => update("line2", event.target.value)}
          />
        </label>
        <label>
          Barangay
          <input
            value={form.barangay}
            onChange={(event) => update("barangay", event.target.value)}
          />
        </label>
        <label>
          City
          <input value={form.city} onChange={(event) => update("city", event.target.value)} />
        </label>
        <label>
          Province
          <input
            value={form.province}
            onChange={(event) => update("province", event.target.value)}
          />
        </label>
        <label>
          Postal code
          <input
            inputMode="numeric"
            maxLength={4}
            value={form.postalCode}
            onChange={(event) => update("postalCode", event.target.value)}
          />
        </label>
        <label className="address-form-wide">
          Delivery instructions
          <textarea
            value={form.instructions ?? ""}
            onChange={(event) => update("instructions", event.target.value)}
          />
        </label>
      </div>
      <div className="address-editor-actions">
        <button
          className="button button-small"
          disabled={pending}
          onClick={() => {
            void (async () => {
              setPending(true);
              setMessage(null);
              try {
                const client = createApiClient(createSameOriginApiTransport());
                if (initialAddress) {
                  await client.updateDeliveryAddress(form);
                } else {
                  await client.createDeliveryAddress(form, crypto.randomUUID());
                }
                router.refresh();
              } catch (error) {
                setMessage(
                  error instanceof ApiClientError
                    ? error.message
                    : "We could not save your address.",
                );
              } finally {
                setPending(false);
              }
            })();
          }}
          type="button"
        >
          {pending ? "Saving..." : initialAddress ? "Update selected address" : "Add address"}
        </button>
        {message ? (
          <p className="auth-message" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
