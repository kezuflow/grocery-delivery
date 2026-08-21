import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { DeliveryEventRequest } from "@carbon/contracts";

const databaseName = "carbon-deliveryman";
const storeName = "event-queue";

export type QueuedDeliveryEvent = DeliveryEventRequest & {
  status: "pending" | "conflict";
  errorMessage: string | null;
  queuedAt: string;
};

interface DeliveryDatabase extends DBSchema {
  "event-queue": {
    key: string;
    value: QueuedDeliveryEvent;
    indexes: { "by-queued-at": string };
  };
}

let databasePromise: Promise<IDBPDatabase<DeliveryDatabase>> | null = null;

function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDB<DeliveryDatabase>(databaseName, 1, {
      upgrade(database) {
        const store = database.createObjectStore(storeName, { keyPath: "clientEventId" });
        store.createIndex("by-queued-at", "queuedAt");
      },
    });
  }
  return databasePromise;
}

export async function listQueuedEvents(): Promise<QueuedDeliveryEvent[]> {
  const database = await getDatabase();
  return database.getAllFromIndex(storeName, "by-queued-at");
}

export async function enqueueDeliveryEvent(event: DeliveryEventRequest) {
  const database = await getDatabase();
  const queued: QueuedDeliveryEvent = {
    ...event,
    status: "pending",
    errorMessage: null,
    queuedAt: new Date().toISOString(),
  };
  await database.put(storeName, queued);
  window.dispatchEvent(new Event("carbon:delivery-queue-change"));
  return queued;
}

export async function removeQueuedEvent(clientEventId: string) {
  const database = await getDatabase();
  await database.delete(storeName, clientEventId);
}

export async function markQueuedEventConflict(clientEventId: string, errorMessage: string) {
  const database = await getDatabase();
  const event = await database.get(storeName, clientEventId);
  if (!event) return;
  await database.put(storeName, { ...event, status: "conflict", errorMessage });
}

export async function retryQueuedEvent(clientEventId: string) {
  const database = await getDatabase();
  const event = await database.get(storeName, clientEventId);
  if (!event) return;
  await database.put(storeName, { ...event, status: "pending", errorMessage: null });
}
