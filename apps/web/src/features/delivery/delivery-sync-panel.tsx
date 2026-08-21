"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DeliveryEventRequest } from "@carbon/contracts";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "../../components/ui";
import {
  listQueuedEvents,
  markQueuedEventConflict,
  removeQueuedEvent,
  retryQueuedEvent,
  type QueuedDeliveryEvent,
} from "./delivery-queue";

export function DeliverySyncPanel({
  onQueueChange,
}: Readonly<{ onQueueChange?: (events: readonly QueuedDeliveryEvent[]) => void }>) {
  const [events, setEvents] = useState<QueuedDeliveryEvent[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const syncingRef = useRef(false);
  const client = useMemo(() => createApiClient(createSameOriginApiTransport()), []);

  const refresh = useCallback(async () => {
    const next = await listQueuedEvents();
    setEvents(next);
    onQueueChange?.(next);
  }, [onQueueChange]);

  const flush = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    setMessage(null);
    try {
      const pending = (await listQueuedEvents()).filter((event) => event.status === "pending");
      for (const event of pending) {
        try {
          await client.submitDeliveryEvent(toRequest(event));
          await removeQueuedEvent(event.clientEventId);
        } catch (error) {
          if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
            await markQueuedEventConflict(event.clientEventId, error.message);
            setMessage("A delivery event needs review before it can be retried.");
            break;
          }
          setMessage("Sync paused. The event will retry when the connection is stable.");
          break;
        }
      }
    } finally {
      await refresh();
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [client, refresh]);

  useEffect(() => {
    void refresh();
    void flush();
    const handler = () => void flush();
    window.addEventListener("online", handler);
    window.addEventListener("carbon:delivery-queue-change", handler);
    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("carbon:delivery-queue-change", handler);
    };
  }, [flush, refresh]);

  return (
    <Card aria-live="polite">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Sync status</CardTitle>
            <CardDescription>
              Events stay on this device until the API confirms receipt.
            </CardDescription>
          </div>
          <Badge tone={events.length === 0 ? "success" : "warning"}>
            {events.length === 0 ? "Up to date" : `${events.length} waiting`}
          </Badge>
        </div>
      </CardHeader>
      {message ? <p className="mb-4 text-sm font-semibold text-warning">{message}</p> : null}
      {events.length === 0 ? (
        <EmptyState
          title="No events waiting to sync"
          description="New events will appear here while you are offline or the API is unavailable."
        />
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <div
              className="rounded border border-line bg-paper p-3 text-sm"
              key={event.clientEventId}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="capitalize">{event.type.replaceAll("_", " ")}</strong>
                <Badge tone={event.status === "conflict" ? "danger" : "warning"}>
                  {event.status === "conflict" ? "Needs review" : "Pending"}
                </Badge>
              </div>
              <p className="mt-1 text-muted">
                Order {event.orderId} · queued {formatTime(event.queuedAt)}
              </p>
              {event.errorMessage ? <p className="mt-2 text-danger">{event.errorMessage}</p> : null}
              {event.status === "conflict" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      void (async () => {
                        await retryQueuedEvent(event.clientEventId);
                        await refresh();
                        await flush();
                      })();
                    }}
                    size="sm"
                    tone="secondary"
                    type="button"
                  >
                    Retry event
                  </Button>
                  <Button
                    onClick={() => {
                      void (async () => {
                        await removeQueuedEvent(event.clientEventId);
                        await refresh();
                      })();
                    }}
                    size="sm"
                    tone="danger"
                    type="button"
                  >
                    Remove from device
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      <div className="mt-4">
        <Button
          loading={syncing}
          onClick={() => void flush()}
          size="sm"
          tone="secondary"
          type="button"
        >
          Sync now
        </Button>
      </div>
    </Card>
  );
}

function toRequest(event: QueuedDeliveryEvent): DeliveryEventRequest {
  return {
    clientEventId: event.clientEventId,
    assignmentId: event.assignmentId,
    orderId: event.orderId,
    type: event.type,
    occurredAt: event.occurredAt,
    note: event.note,
    failureReason: event.failureReason,
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
