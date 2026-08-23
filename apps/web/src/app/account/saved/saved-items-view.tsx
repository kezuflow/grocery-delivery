"use client";

import { useState } from "react";
import type { SavedItemsResponse } from "@carbon/contracts";
import { ImageIcon, Trash2 } from "lucide-react";
import { Button, EmptyState } from "../../../components/ui";
import {
  createApiClient,
  createSameOriginApiTransport,
  ApiClientError,
} from "../../../lib/api/client";
import { formatPhp } from "../../../lib/format";

export function SavedItemsView({
  items: initialItems,
}: Readonly<{ items: SavedItemsResponse["data"]["items"] }>) {
  const [items, setItems] = useState(initialItems);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function remove(skuId: string) {
    if (pending) return;
    setPending(skuId);
    setMessage(null);
    try {
      const response = await createApiClient(createSameOriginApiTransport()).removeSavedItem(skuId);
      setItems(response.data.items);
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "Saved items could not be updated.",
      );
    } finally {
      setPending(null);
    }
  }

  if (!items.length) {
    return (
      <EmptyState
        description="Save items from the shop to find them here next week."
        title="No saved items yet"
      />
    );
  }

  return (
    <section aria-label="Saved grocery items" className="saved-items-grid">
      {message ? (
        <p className="form-message" role="status">
          {message}
        </p>
      ) : null}
      {items.map((item) => (
        <article className="saved-item" key={item.skuId}>
          <div className="saved-item-image">
            {item.imageUrl ? (
              <img alt="" src={item.imageUrl} />
            ) : (
              <ImageIcon aria-hidden="true" size={28} />
            )}
          </div>
          <div className="saved-item-copy">
            <p className="eyebrow">{item.unit}</p>
            <h2>{item.name}</h2>
            <strong>{formatPhp(item.price.centavos)}</strong>
          </div>
          <Button
            disabled={pending === item.skuId}
            onClick={() => void remove(item.skuId)}
            size="sm"
            tone="secondary"
          >
            <Trash2 aria-hidden="true" size={16} /> Remove
          </Button>
        </article>
      ))}
    </section>
  );
}
