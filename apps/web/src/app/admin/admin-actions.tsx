"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import type { ProcurementResponse, PromotionAdminSummary } from "@carbon/contracts";

type Props = Readonly<{
  permissions: string[];
  procurement: ProcurementResponse["data"] | null;
  promotions: PromotionAdminSummary[];
}>;

export function AdminActions({ permissions, procurement, promotions }: Props) {
  const router = useRouter();
  const client = createApiClient(createSameOriginApiTransport());
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const can = (permission: string) => permissions.includes(permission);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage("Saved. The server-owned dashboard has been refreshed.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? `${error.message} (${error.code})`
          : "The operation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-panel account-panel-wide" aria-label="Operations actions">
      <div className="account-panel-heading">
        <p className="eyebrow">Actions</p>
        <span>{busy ? "Saving..." : (message ?? "Server-controlled workflows")}</span>
      </div>
      {can("procurement") && procurement ? (
        <div className="admin-action-grid">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(() =>
                client.saveAdminPurchase({
                  skuId: form.get("skuId"),
                  purchasedQuantity: Number(form.get("purchasedQuantity")),
                }),
              );
            }}
          >
            <h3>Record purchase</h3>
            <input name="skuId" placeholder="SKU" required />
            <input name="purchasedQuantity" type="number" min="0" placeholder="Quantity" required />
            <button type="submit" disabled={busy}>
              Save purchase
            </button>
          </form>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(() =>
                client.createAdminShortage({
                  skuId: form.get("skuId"),
                  requestedQuantity: Number(form.get("requestedQuantity")),
                  availableQuantity: Number(form.get("availableQuantity")),
                }),
              );
            }}
          >
            <h3>Record shortage</h3>
            <input name="skuId" placeholder="SKU" required />
            <input
              name="requestedQuantity"
              type="number"
              min="1"
              placeholder="Requested"
              required
            />
            <input
              name="availableQuantity"
              type="number"
              min="0"
              placeholder="Available"
              required
            />
            <button type="submit" disabled={busy}>
              Save shortage
            </button>
          </form>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(() =>
                client.createAdminSubstitution({
                  shortageId: form.get("shortageId"),
                  substituteSkuId: form.get("substituteSkuId"),
                  quantity: Number(form.get("quantity")),
                  status: form.get("status"),
                }),
              );
            }}
          >
            <h3>Substitution</h3>
            <input name="shortageId" placeholder="Shortage ID" required />
            <input name="substituteSkuId" placeholder="Substitute SKU" required />
            <input name="quantity" type="number" min="1" placeholder="Quantity" required />
            <select name="status" defaultValue="proposed">
              <option value="proposed">Propose</option>
              <option value="approved">Approve</option>
              <option value="rejected">Reject</option>
            </select>
            <button type="submit" disabled={busy}>
              Save substitution
            </button>
          </form>
        </div>
      ) : null}
      {can("packing") && procurement ? (
        <div className="admin-action-grid">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(() =>
                client.savePackingManifest({
                  orderId: form.get("orderId"),
                  status: form.get("status"),
                }),
              );
            }}
          >
            <h3>Update packing</h3>
            <input name="orderId" placeholder="Order ID" required />
            <select name="status" defaultValue="packed">
              <option value="pending">Pending</option>
              <option value="packed">Packed</option>
              <option value="exception">Exception</option>
            </select>
            <button type="submit" disabled={busy}>
              Save manifest
            </button>
          </form>
        </div>
      ) : null}
      {can("dispatch") ? (
        <form
          className="admin-action-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void run(() =>
              client.assignDispatch({
                orderId: form.get("orderId"),
                windowId: form.get("windowId"),
                deliverymanUserId: form.get("deliverymanUserId"),
              }),
            );
          }}
        >
          <h3>Assign dispatch</h3>
          <input name="orderId" placeholder="Order ID" required />
          <input name="windowId" placeholder="Window ID" required />
          <input name="deliverymanUserId" placeholder="Deliveryman user ID" required />
          <button type="submit" disabled={busy}>
            Save assignment
          </button>
        </form>
      ) : null}
      {can("marketing") && promotions.length ? (
        <div className="admin-action-grid">
          {promotions.map((promotion) => (
            <div key={promotion.id}>
              <h3>{promotion.code ?? promotion.id}</h3>
              <p>
                {promotion.status} · {promotion.redemptionCount} redemptions
              </p>
              <div className="admin-button-row">
                {promotion.status !== "paused" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        client.updateAdminPromotionStatus(promotion.id, { status: "paused" }),
                      )
                    }
                  >
                    Pause
                  </button>
                ) : null}
                {promotion.status === "paused" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        client.updateAdminPromotionStatus(promotion.id, { status: "active" }),
                      )
                    }
                  >
                    Resume
                  </button>
                ) : null}
                {promotion.status !== "archived" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        client.updateAdminPromotionStatus(promotion.id, { status: "archived" }),
                      )
                    }
                  >
                    Archive
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {can("marketing") ? (
        <form
          className="admin-action-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const startsAtValue = form.get("startsAt");
            const endsAtValue = form.get("endsAt");
            if (typeof startsAtValue !== "string" || typeof endsAtValue !== "string") return;
            const startsAt = new Date(startsAtValue).toISOString();
            const endsAt = new Date(endsAtValue).toISOString();
            void run(() =>
              client.createAdminPromotion({
                code: form.get("code"),
                startsAt,
                endsAt,
                discount: {
                  kind: "fixed",
                  amount: { centavos: Number(form.get("discountCentavos")), currency: "PHP" },
                },
                minimumSubtotal: null,
                planIds: [],
                skuIds: [],
                categoryIds: [],
                firstOrderOnly: false,
                firstWeekOnly: false,
                totalBudget: null,
                totalRedemptions: null,
                perCustomerRedemptions: null,
                allowsStacking: false,
              }),
            );
          }}
        >
          <h3>Draft campaign</h3>
          <input name="code" placeholder="Coupon code" minLength={2} maxLength={32} required />
          <input
            name="discountCentavos"
            type="number"
            min="1"
            placeholder="Discount centavos"
            required
          />
          <label>
            Starts <input name="startsAt" type="datetime-local" required />
          </label>
          <label>
            Ends <input name="endsAt" type="datetime-local" required />
          </label>
          <button type="submit" disabled={busy}>
            Save draft
          </button>
        </form>
      ) : null}
    </section>
  );
}
