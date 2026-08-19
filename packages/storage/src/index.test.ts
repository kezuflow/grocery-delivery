import { describe, expect, it } from "vitest";
import { DeterministicMediaSigner } from "./index.js";

describe("delivery media signer", () => {
  it("creates bounded upload and download URLs", async () => {
    const signer = new DeterministicMediaSigner("https://media.test");
    const upload = await signer.createUploadUrl({
      objectKey: "orders/order-1/a.jpg",
      contentType: "image/jpeg",
      expiresAt: "2026-08-22T05:00:00.000Z",
    });
    const download = await signer.createDownloadUrl({
      objectKey: "orders/order-1/a.jpg",
      expiresAt: "2026-08-22T05:00:00.000Z",
    });
    expect(upload.uploadUrl).toContain("/upload/");
    expect(download.downloadUrl).toContain("/download/");
  });
});
