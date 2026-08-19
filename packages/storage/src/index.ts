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
