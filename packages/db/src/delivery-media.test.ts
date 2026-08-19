import { describe, expect, it } from "vitest";
import { InMemoryDeliveryMediaRepository } from "./delivery-media.js";

describe("delivery media repository", () => {
  it("returns the original record on an idempotent retry", async () => {
    const repository = new InMemoryDeliveryMediaRepository();
    const record = {
      id: "media-1",
      clientMediaId: "client-media-1",
      orderId: "order-1",
      assignmentId: "assignment-1",
      uploadedByUserId: "driver-1",
      kind: "proof_of_delivery" as const,
      objectKey: "orders/order-1/media-1",
      contentType: "image/jpeg",
      sizeBytes: 100,
      createdAt: "2026-08-22T04:00:00.000Z",
    };
    await repository.save(record);
    expect(await repository.save({ ...record, id: "media-2" })).toMatchObject({ id: "media-1" });
  });
});
