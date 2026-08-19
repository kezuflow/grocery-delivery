"use client";

import type { DeliverymanAssignmentsResponse, DeliveryEventRequest } from "@carbon/contracts";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";

const QUEUE_KEY = "carbon.deliveryman.event-queue";
const eventTypes = ["picked_up", "arrived", "delivered", "failed"] as const;

export function DeliverymanConsole({
  initial,
}: Readonly<{ initial: DeliverymanAssignmentsResponse["data"] }>) {
  const [assignments, setAssignments] = useState(initial.assignments);
  const [queued, setQueued] = useState<DeliveryEventRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const client = useMemo(() => createApiClient(createSameOriginApiTransport()), []);

  useEffect(() => {
    try {
      setQueued(JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as DeliveryEventRequest[]);
    } catch {
      setQueued([]);
    }
  }, []);

  const flush = useCallback(async () => {
    const pending = [...queued];
    for (const event of pending) {
      try {
        await client.submitDeliveryEvent(event);
        setQueued((current) =>
          current.filter((item) => item.clientEventId !== event.clientEventId),
        );
      } catch {
        break;
      }
    }
  }, [client, queued]);

  useEffect(() => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queued));
  }, [queued]);
  useEffect(() => {
    void flush();
    const handler = () => void flush();
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [flush]);

  const record = (assignment: (typeof assignments)[number], type: (typeof eventTypes)[number]) => {
    const event: DeliveryEventRequest = {
      clientEventId: crypto.randomUUID(),
      assignmentId: assignment.id,
      orderId: assignment.orderId,
      type,
      occurredAt: new Date().toISOString(),
      note: null,
    };
    setQueued((current) => [...current, event]);
    setMessage(
      navigator.onLine ? "Syncing event..." : "Saved offline. It will sync when you reconnect.",
    );
    void flush();
  };

  const refresh = async () => {
    try {
      const response = await client.getDeliverymanAssignments();
      setAssignments(response.data.assignments);
      setMessage(null);
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "Assignments could not be refreshed.",
      );
    }
  };

  return (
    <main className="account-page deliveryman-page">
      <header className="site-header account-header">
        <a className="wordmark" href="/" aria-label="Carbon Food Delivery home">
          <span className="wordmark-mark">C</span>
          <span>Carbon</span>
        </a>
        <nav>
          <a href="/">Storefront</a>
        </nav>
      </header>
      <section className="account-intro">
        <div>
          <p className="eyebrow">Delivery route</p>
          <h1>{initial.cycleId}</h1>
        </div>
        <span className="account-status">
          {queued.length ? `${queued.length} pending` : "synced"}
        </span>
      </section>
      <section className="deliveryman-toolbar">
        <button className="button button-small" onClick={() => void refresh()} type="button">
          Refresh assignments
        </button>
        {message ? <span role="status">{message}</span> : null}
      </section>
      <section className="deliveryman-list" aria-label="Assigned deliveries">
        {assignments.length === 0 ? (
          <p className="subscription-note">No deliveries are assigned for this cycle.</p>
        ) : (
          assignments.map((assignment) => (
            <article className="deliveryman-card" key={assignment.id}>
              <div>
                <p className="eyebrow">Order {assignment.orderId}</p>
                <h2>{assignment.windowId}</h2>
                <p className="subscription-note">{assignment.lastEventType ?? assignment.status}</p>
              </div>
              <div className="deliveryman-actions">
                {eventTypes.map((type) => (
                  <button
                    className="button button-small"
                    key={type}
                    onClick={() => record(assignment, type)}
                    type="button"
                  >
                    {type.replace("_", " ")}
                  </button>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
