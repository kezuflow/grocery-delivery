"use client";

import { useState } from "react";
import type { DeliverymanAssignmentsResponse } from "@carbon/contracts";

import { Button, EmptyState, ErrorState } from "../../components/ui";
import {
  ApiClientError,
  createApiClient,
  createSameOriginApiTransport,
} from "../../lib/api/client";
import { DeliveryAssignmentCard } from "./delivery-assignment-card";
import { DeliverySyncPanel } from "./delivery-sync-panel";
import type { QueuedDeliveryEvent } from "./delivery-queue";

export function DeliveryDashboard({
  initial,
}: Readonly<{ initial: DeliverymanAssignmentsResponse["data"] }>) {
  const [assignments, setAssignments] = useState(initial.assignments);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState<readonly QueuedDeliveryEvent[]>([]);
  const client = createApiClient(createSameOriginApiTransport());

  async function refresh() {
    try {
      const response = await client.getDeliverymanAssignments();
      setAssignments(response.data.assignments);
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof ApiClientError ? reason.message : "Assignments could not be refreshed.",
      );
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{assignments.length} stops in this cycle</p>
          {queued.length > 0 ? (
            <p className="text-sm font-semibold text-warning">
              {queued.length} event{queued.length === 1 ? "" : "s"} waiting to sync
            </p>
          ) : null}
        </div>
        <Button onClick={() => void refresh()} size="sm" tone="secondary" type="button">
          Refresh assignments
        </Button>
      </div>
      {error ? <ErrorState description={error} onRetry={() => void refresh()} /> : null}
      {assignments.length === 0 ? (
        <EmptyState
          title="No deliveries assigned"
          description="Your route is empty for this cycle. Check again after dispatch assigns new stops."
        />
      ) : (
        <div className="grid gap-5">
          {assignments.map((assignment) => (
            <DeliveryAssignmentCard
              assignment={assignment}
              key={assignment.id}
              onQueued={() => void refresh()}
            />
          ))}
        </div>
      )}
      <DeliverySyncPanel onQueueChange={setQueued} />
    </div>
  );
}
