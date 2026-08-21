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

export type SignedMediaRequest = Readonly<{
  objectKey: string;
  contentType?: string;
  expiresAt: string;
  signature: string;
}>;

/**
 * Signs first-party media URLs with a short-lived HMAC token. The API can
 * verify the token before reading or writing the private R2 bucket, so media
 * never needs to be public and callers do not receive bucket credentials.
 */
export class HmacDeliveryMediaSigner implements DeliveryMediaSigner {
  constructor(
    private readonly secret: string,
    private readonly baseUrl: string,
    private readonly pathPrefix = "/api/v1/media",
  ) {
    if (!secret.trim()) throw new Error("media signing secret must not be empty");
    if (!baseUrl.startsWith("https://") && !baseUrl.startsWith("http://localhost")) {
      throw new Error("media signing base URL must use HTTPS outside local development");
    }
  }

  async createUploadUrl(input: { objectKey: string; contentType: string; expiresAt: string }) {
    const signature = await signMediaRequest(this.secret, {
      objectKey: input.objectKey,
      contentType: input.contentType,
      expiresAt: input.expiresAt,
    });
    const query = new URLSearchParams({
      objectKey: input.objectKey,
      contentType: input.contentType,
      expiresAt: input.expiresAt,
      signature,
    });
    return { uploadUrl: `${this.baseUrl}${this.pathPrefix}/upload?${query.toString()}` };
  }

  async createDownloadUrl(input: { objectKey: string; expiresAt: string }) {
    const signature = await signMediaRequest(this.secret, input);
    const query = new URLSearchParams({
      objectKey: input.objectKey,
      expiresAt: input.expiresAt,
      signature,
    });
    return { downloadUrl: `${this.baseUrl}${this.pathPrefix}/download?${query.toString()}` };
  }
}

export async function verifyMediaRequest(secret: string, request: SignedMediaRequest) {
  if (!secret.trim() || !request.objectKey.trim() || !request.expiresAt.trim()) return false;
  const expiry = Date.parse(request.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return false;
  const expected = await signMediaRequest(secret, request);
  return timingSafeEqual(expected, request.signature);
}

async function signMediaRequest(
  secret: string,
  input: Readonly<{ objectKey: string; contentType?: string; expiresAt: string }>,
) {
  const payload = [input.objectKey, input.contentType ?? "", input.expiresAt].join("\n");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
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
