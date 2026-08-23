"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import type {
  ProcurementResponse,
  PromotionAdminSummary,
  SupportCasesResponse,
  AdminOrderRequestsResponse,
} from "@carbon/contracts";

import type { AdminPermission } from "../../lib/permissions";

type Props = Readonly<{
  scope: AdminPermission;
  permissions: readonly AdminPermission[];
  procurement: ProcurementResponse["data"] | null;
  promotions: PromotionAdminSummary[];
  supportCases: SupportCasesResponse["data"]["cases"];
  orderRequests: AdminOrderRequestsResponse["data"]["requests"];
}>;

export function AdminActions({
  scope,
  permissions,
  procurement,
  promotions,
  supportCases,
  orderRequests,
}: Props) {
  const router = useRouter();
  const client = createApiClient(createSameOriginApiTransport());
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refundKey, setRefundKey] = useState(() => crypto.randomUUID());
  const can = (permission: AdminPermission) => permissions.includes(permission);

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage("Saved. The server-owned dashboard has been refreshed.");
      router.refresh();
      return true;
    } catch (error) {
      setMessage(
        error instanceof ApiClientError
          ? `${error.message} (${error.code}${error.correlationId ? `, ${error.correlationId}` : ""})`
          : "The operation failed.",
      );
    } finally {
      setBusy(false);
    }
    return false;
  }

  return (
    <section
      className="account-panel account-panel-wide"
      aria-label="Operations actions"
      id="actions"
    >
      <div className="account-panel-heading">
        <p className="eyebrow">Actions</p>
        <span>{busy ? "Saving..." : (message ?? "Server-controlled workflows")}</span>
      </div>
      {(scope === "support" || scope === "finance") && orderRequests.length ? (
        <div className="admin-action-grid">
          {orderRequests.map((request) => {
            const permitted = request.kind === "refund" ? can("finance") : can("support");
            if (!permitted) return null;
            return (
              <div key={request.id}>
                <h3>{request.kind === "refund" ? "Refund request" : "Cancellation request"}</h3>
                <p>{request.reason}</p>
                <small>
                  {request.orderId} · {request.customerId} · {request.status}
                </small>
                <div className="admin-button-row">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        client.decideAdminOrderRequest(
                          request.id,
                          "approve",
                          `order-request:${request.id}:approve`,
                        ),
                      )
                    }
                  >
                    Approve and execute
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        client.decideAdminOrderRequest(
                          request.id,
                          "reject",
                          `order-request:${request.id}:reject`,
                        ),
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {scope === "procurement" && can("procurement") && procurement ? (
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
            <input aria-label="Purchase SKU" name="skuId" placeholder="SKU" required />
            <input
              aria-label="Purchased quantity"
              name="purchasedQuantity"
              type="number"
              min="0"
              placeholder="Quantity"
              required
            />
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
            <input aria-label="Shortage SKU" name="skuId" placeholder="SKU" required />
            <input
              name="requestedQuantity"
              aria-label="Requested quantity"
              type="number"
              min="1"
              placeholder="Requested"
              required
            />
            <input
              name="availableQuantity"
              aria-label="Available quantity"
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
                  orderId: form.get("orderId") || undefined,
                  substituteSkuId: form.get("substituteSkuId"),
                  quantity: Number(form.get("quantity")),
                  status: form.get("status"),
                }),
              );
            }}
          >
            <h3>Substitution</h3>
            <input aria-label="Shortage ID" name="shortageId" placeholder="Shortage ID" required />
            <input
              aria-label="Substitute SKU"
              name="substituteSkuId"
              placeholder="Substitute SKU"
              required
            />
            <input
              aria-label="Affected order ID"
              name="orderId"
              placeholder="Affected order ID (optional)"
            />
            <input
              aria-label="Substitution quantity"
              name="quantity"
              type="number"
              min="1"
              placeholder="Quantity"
              required
            />
            <select aria-label="Substitution status" name="status" defaultValue="proposed">
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
      {scope === "packing" && can("packing") && procurement ? (
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
            <input aria-label="Packing order ID" name="orderId" placeholder="Order ID" required />
            <select aria-label="Packing status" name="status" defaultValue="packed">
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
      {scope === "dispatch" && can("dispatch") ? (
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
          <input aria-label="Dispatch order ID" name="orderId" placeholder="Order ID" required />
          <input aria-label="Dispatch window ID" name="windowId" placeholder="Window ID" required />
          <input
            aria-label="Delivery staff user ID"
            name="deliverymanUserId"
            placeholder="Deliveryman user ID"
            required
          />
          <button type="submit" disabled={busy}>
            Save assignment
          </button>
        </form>
      ) : null}
      {scope === "marketing" && can("marketing") && promotions.length ? (
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
                  can("finance") ? (
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
                  ) : (
                    <span className="text-xs text-muted">Finance approval required to resume</span>
                  )
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
      {scope === "marketing" && can("marketing") ? (
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
      {scope === "finance" && can("finance") ? (
        <form
          className="admin-action-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void (async () => {
              const saved = await run(() =>
                client.refundPayment(
                  {
                    customerId: form.get("customerId"),
                    paymentAttemptId: form.get("paymentAttemptId"),
                    amount: { centavos: Number(form.get("amountCentavos")), currency: "PHP" },
                    reason: form.get("reason"),
                  },
                  refundKey,
                ),
              );
              if (saved) setRefundKey(crypto.randomUUID());
            })();
          }}
        >
          <h3>Issue refund</h3>
          <input name="customerId" placeholder="Customer ID" required />
          <input name="paymentAttemptId" placeholder="Payment attempt ID" required />
          <input
            name="amountCentavos"
            type="number"
            min="1"
            placeholder="Amount centavos"
            required
          />
          <textarea name="reason" maxLength={500} placeholder="Approved refund reason" required />
          <button type="submit" disabled={busy}>
            Submit refund
          </button>
        </form>
      ) : null}
      {scope === "support" && can("support") ? (
        <div className="admin-action-grid" id="support">
          {supportCases.length ? (
            supportCases.map((supportCase) => (
              <form
                key={supportCase.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  void run(() =>
                    client.updateAdminSupportCaseStatus(supportCase.id, {
                      status: form.get("status"),
                    }),
                  );
                }}
              >
                <h3>{supportCase.subject}</h3>
                <p>{supportCase.message}</p>
                <select name="status" defaultValue={supportCase.status}>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button type="submit" disabled={busy}>
                  Update case
                </button>
              </form>
            ))
          ) : (
            <p className="subscription-note">No open support cases.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
