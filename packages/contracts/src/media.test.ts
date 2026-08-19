import { describe, expect, it } from "vitest";
import { deliveryMediaUploadRequestSchema } from "./media";

describe("media contracts", () => {
  it("rejects non-image uploads", () => {
    expect(() =>
      deliveryMediaUploadRequestSchema.parse({
        clientMediaId: "media-1",
        assignmentId: "assignment-1",
        orderId: "order-1",
        kind: "proof_of_delivery",
        contentType: "application/pdf",
        sizeBytes: 20,
      }),
    ).toThrow();
  });
});
