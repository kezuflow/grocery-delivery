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
const failureReasons = [
  ["customer_unavailable", "Customer unavailable"],
  ["address_inaccessible", "Address inaccessible"],
  ["damaged_order", "Damaged order"],
  ["other", "Other"],
] as const;

export function DeliverymanConsole({
  initial,
}: Readonly<{ initial: DeliverymanAssignmentsResponse["data"] }>) {
  const [assignments, setAssignments] = useState(initial.assignments);
  const [queued, setQueued] = useState<DeliveryEventRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busyAssignment, setBusyAssignment] = useState<string | null>(null);
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
      } catch (error) {
        if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
          setQueued((current) =>
            current.filter((item) => item.clientEventId !== event.clientEventId),
          );
          setMessage(`${error.message} Refresh the route before recording another event.`);
          continue;
        }
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

  const record = (
    assignment: (typeof assignments)[number],
    type: (typeof eventTypes)[number],
    failureReason: DeliveryEventRequest["failureReason"] = null,
  ) => {
    const event: DeliveryEventRequest = {
      clientEventId: crypto.randomUUID(),
      assignmentId: assignment.id,
      orderId: assignment.orderId,
      type,
      occurredAt: new Date().toISOString(),
      note: null,
      failureReason,
    };
    setQueued((current) => [...current, event]);
    setMessage(
      navigator.onLine ? "Syncing event..." : "Saved offline. It will sync when you reconnect.",
    );
    void flush();
  };

  const uploadProof = async (assignment: (typeof assignments)[number], file: File) => {
    setBusyAssignment(assignment.id);
    setMessage("Uploading proof of delivery...");
    try {
      const signed = await client.createDeliveryMediaUpload({
        clientMediaId: crypto.randomUUID(),
        assignmentId: assignment.id,
        orderId: assignment.orderId,
        kind: "proof_of_delivery",
        contentType: file.type,
        sizeBytes: file.size,
      });
      const response = await fetch(signed.data.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("proof upload failed");
      setMessage("Proof of delivery uploaded.");
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "Proof could not be uploaded. Try again.",
      );
    } finally {
      setBusyAssignment(null);
    }
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
    <section className="grid gap-6" aria-label="Assigned deliveries">
      <section className="deliveryman-toolbar">
        <button className="button button-small" onClick={() => void refresh()} type="button">
          Refresh assignments
        </button>
        {message ? <span role="status">{message}</span> : null}
      </section>
      <div className="deliveryman-list">
        {assignments.length === 0 ? (
          <p className="subscription-note">No deliveries are assigned for this cycle.</p>
        ) : (
          assignments.map((assignment) => (
            <article className="deliveryman-card" key={assignment.id}>
              <div>
                <p className="eyebrow">
                  Stop {assignment.routeSequence} · Order {assignment.orderId}
                </p>
                <h2>{assignment.windowId}</h2>
                {assignment.recipientName ? <p>{assignment.recipientName}</p> : null}
                {assignment.recipientPhone ? <p>{assignment.recipientPhone}</p> : null}
                {assignment.deliveryAddress ? (
                  <p className="subscription-note">
                    {assignment.deliveryAddress.line1}, {assignment.deliveryAddress.barangay},{" "}
                    {assignment.deliveryAddress.city}, {assignment.deliveryAddress.province}{" "}
                    {assignment.deliveryAddress.postalCode}
                    {assignment.deliveryAddress.instructions
                      ? ` · ${assignment.deliveryAddress.instructions}`
                      : ""}
                  </p>
                ) : null}
                <div className="deliveryman-contact-actions">
                  {assignment.recipientPhone ? (
                    <a className="button button-small" href={`tel:${assignment.recipientPhone}`}>
                      Call customer
                    </a>
                  ) : null}
                  {assignment.deliveryAddress ? (
                    <a
                      className="button button-small"
                      href={createMapUrl(assignment.deliveryAddress)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open map
                    </a>
                  ) : null}
                  <a className="button button-small" href="/account#support">
                    Contact support
                  </a>
                </div>
                <p className="subscription-note">{assignment.lastEventType ?? assignment.status}</p>
              </div>
              <div className="deliveryman-actions">
                {eventTypes
                  .filter((type) => isNextEvent(assignment.lastEventType, type))
                  .map((type) =>
                    type === "failed" ? (
                      <label key={type}>
                        <span className="sr-only">Failure reason</span>
                        <select
                          defaultValue=""
                          onChange={(event) => {
                            const reason = event.target
                              .value as DeliveryEventRequest["failureReason"];
                            if (reason) record(assignment, "failed", reason);
                            event.target.value = "";
                          }}
                        >
                          <option value="" disabled>
                            Record failed delivery
                          </option>
                          {failureReasons.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <button
                        className="button button-small"
                        key={type}
                        onClick={() => record(assignment, type)}
                        type="button"
                      >
                        {type.replace("_", " ")}
                      </button>
                    ),
                  )}
                {assignment.lastEventType === "arrived" ? (
                  <label className="button button-small">
                    {busyAssignment === assignment.id ? "Uploading..." : "Add proof photo"}
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      disabled={busyAssignment === assignment.id}
                      hidden
                      type="file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadProof(assignment, file);
                        event.target.value = "";
                      }}
                    />
                  </label>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function createMapUrl(
  address: NonNullable<
    DeliverymanAssignmentsResponse["data"]["assignments"][number]["deliveryAddress"]
  >,
) {
  const query = [
    address.line1,
    address.line2,
    address.barangay,
    address.city,
    address.province,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function isNextEvent(
  previous: (typeof eventTypes)[number] | null,
  next: (typeof eventTypes)[number],
) {
  if (previous === null) return next === "picked_up";
  if (previous === "picked_up") return next === "arrived";
  if (previous === "arrived") return next === "delivered" || next === "failed";
  return false;
}
