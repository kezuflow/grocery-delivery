import { describe, expect, it } from "vitest";
import {
  DeterministicMediaSigner,
  DeterministicPromotionMediaSigner,
  HmacDeliveryMediaSigner,
  verifyMediaRequest,
} from "./index.js";

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

describe("promotion media signer", () => {
  it("uses a dedicated promotional object path and upload constraints", async () => {
    const signer = new DeterministicPromotionMediaSigner("https://media.test");
    const upload = await signer.createUploadUrl({
      objectKey: "promotions/banner-1/desktop/image.webp",
      contentType: "image/webp",
      sizeBytes: 120_000,
      expiresAt: "2026-08-22T05:00:00.000Z",
    });
    expect(upload.uploadUrl).toContain("/promotions/upload/");
    expect(upload.uploadUrl).toContain("sizeBytes=120000");
  });
});

describe("HMAC delivery media signer", () => {
  it("creates URLs that verify and rejects tampering or expiry", async () => {
    const signer = new HmacDeliveryMediaSigner("s".repeat(32), "https://api.example.test");
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const upload = await signer.createUploadUrl({
      objectKey: "orders/order-1/media-1",
      contentType: "image/jpeg",
      expiresAt,
    });
    const uploadUrl = new URL(upload.uploadUrl);
    const request = {
      objectKey: uploadUrl.searchParams.get("objectKey")!,
      contentType: uploadUrl.searchParams.get("contentType")!,
      expiresAt: uploadUrl.searchParams.get("expiresAt")!,
      signature: uploadUrl.searchParams.get("signature")!,
    };
    await expect(verifyMediaRequest("s".repeat(32), request)).resolves.toBe(true);
    await expect(
      verifyMediaRequest("s".repeat(32), { ...request, objectKey: "orders/other" }),
    ).resolves.toBe(false);
    await expect(
      verifyMediaRequest("s".repeat(32), {
        ...request,
        expiresAt: new Date(Date.now() - 1_000).toISOString(),
      }),
    ).resolves.toBe(false);
  });
});
