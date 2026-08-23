"use client";

import { useState } from "react";
import type { OrderListResponse } from "@carbon/contracts";
import { RotateCcw } from "lucide-react";
import { Button } from "../../components/ui";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

export function ReorderButton({
  lines,
}: Readonly<{ lines: OrderListResponse["data"]["orders"][number]["lines"] }>) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reorder() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const client = createApiClient(createSameOriginApiTransport());
      const cart = await client.getCart();
      const quantities = new Map(cart.data.lines.map((line) => [line.skuId, line.quantity]));
      for (const line of lines)
        quantities.set(line.skuId, (quantities.get(line.skuId) ?? 0) + line.quantity);
      const result = await client.updateCart({
        expectedUpdatedAt: cart.data.updatedAt,
        lines: [...quantities].map(([skuId, quantity]) => ({ skuId, quantity })),
      });
      setMessage(
        result.data.adjustments?.length
          ? "Cart refreshed; review unavailable or changed items."
          : "Items added to your cart.",
      );
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "We could not reorder this purchase.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <span>
      <Button
        aria-label="Reorder these items"
        disabled={pending}
        loading={pending}
        onClick={() => void reorder()}
        size="sm"
        tone="secondary"
        type="button"
      >
        <RotateCcw aria-hidden="true" size={15} /> Reorder
      </Button>
      {message ? (
        <span className="ml-3 text-xs text-muted" role="status">
          {message}
        </span>
      ) : null}
    </span>
  );
}
