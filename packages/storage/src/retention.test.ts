import { describe, expect, it } from "vitest";
import { InMemoryDeliveryMediaRepository } from "@carbon/db";

import { createDeliveryMediaRetentionHandler } from "./retention.js";

describe("delivery media retention", () => {
  it("deletes expired objects before their metadata", async () => {
    const repository = new InMemoryDeliveryMediaRepository();
    await repository.save({
      id: "media-old",
      clientMediaId: "client-old",
      orderId: "order-1",
      assignmentId: "assignment-1",
      uploadedByUserId: "driver-1",
      kind: "proof_of_delivery",
      objectKey: "orders/order-1/delivery/media-old",
      contentType: "image/jpeg",
      sizeBytes: 10,
      createdAt: "2026-07-01T00:00:00.000Z",
    });
    const deleted: string[] = [];
    const run = createDeliveryMediaRetentionHandler(
      repository,
      {
        put: () => Promise.resolve(),
        delete: (key) => {
          deleted.push(key);
          return Promise.resolve();
        },
      },
      { retentionDays: 30, now: () => new Date("2026-08-20T00:00:00.000Z") },
    );

    await expect(run()).resolves.toEqual({ selected: 1, deleted: 1 });
    expect(deleted).toEqual(["orders/order-1/delivery/media-old"]);
    await expect(repository.findByClientId("client-old")).resolves.toBeNull();
  });

  it("rejects repositories without retention operations", () => {
    expect(() =>
      createDeliveryMediaRetentionHandler({} as never, {} as never, { retentionDays: 30 }),
    ).toThrow("does not support retention");
  });
});
