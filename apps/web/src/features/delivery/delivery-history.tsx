"use client";

import { useEffect, useState } from "react";
import type { DeliverymanAssignmentsResponse, DeliveryEvent } from "@carbon/contracts";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  StatusPill,
} from "../../components/ui";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import { formatDeliveryEvent, type DeliveryAssignment } from "./delivery-utils";

export function DeliveryHistory({
  initial,
}: Readonly<{ initial: DeliverymanAssignmentsResponse["data"] }>) {
  const [events, setEvents] = useState<Record<string, DeliveryEvent[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = createApiClient(createSameOriginApiTransport());
    void Promise.all(
      initial.assignments.map(
        async (assignment) =>
          [assignment.id, await client.getDeliverymanEvents(assignment.id)] as const,
      ),
    )
      .then((responses) =>
        setEvents(Object.fromEntries(responses.map(([id, response]) => [id, response.data]))),
      )
      .catch((reason: unknown) =>
        setError(
          reason instanceof ApiClientError
            ? reason.message
            : "Delivery history could not be loaded.",
        ),
      );
  }, [initial.assignments]);

  if (error) return <ErrorState description={error} />;
  if (initial.assignments.length === 0)
    return (
      <EmptyState
        title="No route history yet"
        description="Completed and failed stops will appear here once your cycle has assignments."
      />
    );

  return (
    <div className="grid gap-5">
      {initial.assignments.map((assignment) => (
        <HistoryCard
          assignment={assignment}
          events={events[assignment.id] ?? []}
          key={assignment.id}
        />
      ))}
    </div>
  );
}

function HistoryCard({
  assignment,
  events,
}: Readonly<{ assignment: DeliveryAssignment; events: readonly DeliveryEvent[] }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order {assignment.orderId}</CardTitle>
        <CardDescription>Stop {assignment.routeSequence}</CardDescription>
      </CardHeader>
      {events.length === 0 ? (
        <p className="text-sm text-muted">No events have been received for this stop.</p>
      ) : (
        <ol className="grid gap-3">
          {events.map((event) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 text-sm last:border-0 last:pb-0"
              key={event.id}
            >
              <span>
                <strong className="capitalize">{formatDeliveryEvent(event.type)}</strong>
                <span className="ml-2 text-muted">
                  {new Date(event.occurredAt).toLocaleString()}
                </span>
              </span>
              <StatusPill status={event.type} />
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
