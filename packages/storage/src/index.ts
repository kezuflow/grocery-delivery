export type DeliveryMediaUpload = Readonly<{
  mediaId: string;
  objectKey: string;
  uploadUrl: string;
  expiresAt: string;
}>;

export type DeliveryMediaDownload = Readonly<{
  mediaId: string;
  objectKey: string;
  downloadUrl: string;
  expiresAt: string;
}>;

export interface DeliveryMediaSigner {
  createUploadUrl(input: {
    objectKey: string;
    contentType: string;
    expiresAt: string;
  }): Promise<Pick<DeliveryMediaUpload, "uploadUrl">>;
  createDownloadUrl(input: {
    objectKey: string;
    expiresAt: string;
  }): Promise<Pick<DeliveryMediaDownload, "downloadUrl">>;
}

/** Storage boundary used by retention workers and delivery-media integrations. */
export interface DeliveryMediaObjectStore {
  put(
    objectKey: string,
    value: ArrayBuffer | ReadableStream<Uint8Array>,
    contentType: string,
  ): Promise<void>;
  delete(objectKey: string): Promise<void>;
}

/** Adapter for a Cloudflare R2 bucket. The API still issues signed URLs through a signer. */
export class R2DeliveryMediaObjectStore implements DeliveryMediaObjectStore {
  constructor(
    private readonly bucket: {
      put(key: string, value: unknown, options?: unknown): Promise<unknown>;
      delete(key: string): Promise<void>;
    },
  ) {}

  async put(
    objectKey: string,
    value: ArrayBuffer | ReadableStream<Uint8Array>,
    contentType: string,
  ) {
    await this.bucket.put(objectKey, value, { httpMetadata: { contentType } });
  }

  delete(objectKey: string) {
    return this.bucket.delete(objectKey);
  }
}

export class DeterministicMediaSigner implements DeliveryMediaSigner {
  constructor(private readonly baseUrl = "https://media.invalid") {}

  createUploadUrl(input: { objectKey: string; contentType: string; expiresAt: string }) {
    return Promise.resolve({
      uploadUrl: `${this.baseUrl}/upload/${encodeURIComponent(input.objectKey)}?contentType=${encodeURIComponent(input.contentType)}&expires=${encodeURIComponent(input.expiresAt)}`,
    });
  }

  createDownloadUrl(input: { objectKey: string; expiresAt: string }) {
    return Promise.resolve({
      downloadUrl: `${this.baseUrl}/download/${encodeURIComponent(input.objectKey)}?expires=${encodeURIComponent(input.expiresAt)}`,
    });
  }
}

export interface PromotionMediaSigner {
  createUploadUrl(input: {
    objectKey: string;
    contentType: string;
    sizeBytes: number;
    expiresAt: string;
  }): Promise<{ uploadUrl: string }>;
  createDownloadUrl(input: {
    objectKey: string;
    expiresAt: string;
  }): Promise<{ downloadUrl: string }>;
}

export class DeterministicPromotionMediaSigner implements PromotionMediaSigner {
  constructor(private readonly baseUrl = "https://promotion-media.invalid") {}

  createUploadUrl(input: {
    objectKey: string;
    contentType: string;
    sizeBytes: number;
    expiresAt: string;
  }) {
    const query = new URLSearchParams({
      contentType: input.contentType,
      sizeBytes: String(input.sizeBytes),
      expires: input.expiresAt,
    });
    return Promise.resolve({
      uploadUrl: `${this.baseUrl}/promotions/upload/${encodeURIComponent(input.objectKey)}?${query.toString()}`,
    });
  }

  createDownloadUrl(input: { objectKey: string; expiresAt: string }) {
    const query = new URLSearchParams({ expires: input.expiresAt });
    return Promise.resolve({
      downloadUrl: `${this.baseUrl}/promotions/download/${encodeURIComponent(input.objectKey)}?${query.toString()}`,
    });
  }
}

export * from "./retention.js";
