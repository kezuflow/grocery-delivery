"use client";

import { useMemo, useState } from "react";
import type { DeliveryEventRequest } from "@carbon/contracts";

import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import {
  Badge,
  Button,
  buttonClassName,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  LinkButton,
  Select,
} from "../../components/ui";
import { enqueueDeliveryEvent } from "./delivery-queue";
import {
  createDeliveryEvent,
  createMapUrl,
  failureReasons,
  formatAddress,
  formatDeliveryEvent,
  getNextDeliveryEvents,
  type DeliveryAssignment,
} from "./delivery-utils";

export function DeliveryAssignmentCard({
  assignment,
  onQueued,
}: Readonly<{ assignment: DeliveryAssignment; onQueued?: () => void }>) {
  const [failureReason, setFailureReason] = useState<DeliveryEventRequest["failureReason"]>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const nextEvents = getNextDeliveryEvents(assignment.lastEventType);
  const client = useMemo(() => createApiClient(createSameOriginApiTransport()), []);

  async function record(type: DeliveryEventRequest["type"]) {
    setBusy(true);
    setMessage(null);
    try {
      await enqueueDeliveryEvent(
        createDeliveryEvent(assignment, type, type === "failed" ? failureReason : null),
      );
      setFailureReason(null);
      setMessage(
        navigator.onLine
          ? "Event queued and ready to sync."
          : "Saved offline. It will sync when you reconnect.",
      );
      onQueued?.();
    } catch {
      setMessage("This event could not be saved on the device. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadProof(file: File) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      setMessage("Choose a JPEG, PNG, or WebP image up to 10 MB.");
      return;
    }
    setBusy(true);
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
      if (!response.ok) throw new Error("upload failed");
      setMessage("Proof of delivery uploaded.");
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : "Proof could not be uploaded. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="grid gap-5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Stop {assignment.routeSequence}
            </p>
            <CardTitle>Order {assignment.orderId}</CardTitle>
            <CardDescription>
              {assignment.recipientName ?? "Recipient details unavailable"}
            </CardDescription>
          </div>
          <Badge
            tone={
              assignment.status === "failed"
                ? "danger"
                : assignment.status === "delivered"
                  ? "success"
                  : "accent"
            }
          >
            {formatDeliveryEvent(assignment.lastEventType ?? assignment.status)}
          </Badge>
        </div>
      </CardHeader>
      <div className="grid gap-2 text-sm">
        {assignment.recipientPhone ? (
          <a
            className="font-bold text-deep underline focus-visible:outline-2 focus-visible:outline-deep"
            href={`tel:${assignment.recipientPhone}`}
          >
            Call {assignment.recipientName ?? "customer"}
          </a>
        ) : null}
        {assignment.deliveryAddress ? (
          <p className="text-muted">
            {formatAddress(assignment.deliveryAddress)}
            {assignment.deliveryAddress.instructions
              ? ` · ${assignment.deliveryAddress.instructions}`
              : ""}
          </p>
        ) : (
          <p className="text-muted">Delivery address unavailable.</p>
        )}
        {assignment.deliveryAddress ? (
          <a
            className="w-fit font-bold text-deep underline focus-visible:outline-2 focus-visible:outline-deep"
            href={createMapUrl(assignment.deliveryAddress)}
            rel="noreferrer"
            target="_blank"
          >
            Open map
          </a>
        ) : null}
        <LinkButton
          className="mt-1 w-fit"
          href={`/deliveryman/assignments/${encodeURIComponent(assignment.id)}`}
          size="sm"
          tone="ghost"
        >
          Open assignment detail
        </LinkButton>
      </div>
      {nextEvents.length > 0 ? (
        <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
          {nextEvents.includes("failed") ? (
            <label className="grid gap-1 text-sm font-bold text-ink">
              Failure reason
              <Select
                value={failureReason ?? ""}
                onChange={(event) =>
                  setFailureReason(
                    (event.target.value || null) as DeliveryEventRequest["failureReason"],
                  )
                }
              >
                <option value="">Choose a reason</option>
                {failureReasons.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {nextEvents.map((event) => (
              <Button
                disabled={event === "failed" && !failureReason}
                key={event}
                loading={busy}
                onClick={() => void record(event)}
                size="sm"
                tone={event === "failed" ? "danger" : "primary"}
                type="button"
              >
                Record {event.replaceAll("_", " ")}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm font-semibold text-muted">
          No further delivery events are available for this assignment.
        </p>
      )}
      {assignment.lastEventType === "arrived" ? (
        <label
          className={buttonClassName({
            size: "sm",
            tone: "secondary",
            className: busy ? "pointer-events-none opacity-50" : "w-fit cursor-pointer",
          })}
        >
          Add proof photo
          <input
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadProof(file);
              event.target.value = "";
            }}
            type="file"
          />
        </label>
      ) : null}
      {message ? (
        <p className="text-sm font-semibold text-deep" role="status">
          {message}
        </p>
      ) : null}
    </Card>
  );
}
