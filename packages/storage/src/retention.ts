import type { DeliveryMediaRecord, DeliveryMediaRepository } from "@carbon/db";

import type { DeliveryMediaObjectStore } from "./index.js";

export type DeliveryMediaRetentionResult = Readonly<{
  selected: number;
  deleted: number;
}>;

export function createDeliveryMediaRetentionHandler(
  repository: DeliveryMediaRepository,
  objectStore: DeliveryMediaObjectStore,
  options: Readonly<{ retentionDays: number; batchSize?: number; now?: () => Date }>,
) {
  if (!Number.isInteger(options.retentionDays) || options.retentionDays <= 0) {
    throw new Error("delivery media retention days must be a positive integer");
  }
  const batchSize = options.batchSize ?? 100;
  if (!Number.isInteger(batchSize) || batchSize <= 0 || batchSize > 1000) {
    throw new Error("delivery media retention batch size must be between 1 and 1000");
  }
  if (!repository.listCreatedBefore || !repository.deleteById) {
    throw new Error("delivery media repository does not support retention");
  }
  const now = options.now ?? (() => new Date());

  return async (): Promise<DeliveryMediaRetentionResult> => {
    const cutoff = new Date(now().getTime() - options.retentionDays * 86_400_000).toISOString();
    const records = await repository.listCreatedBefore!(cutoff, batchSize);
    let deleted = 0;
    for (const record of records) {
      await deleteMedia(record, repository, objectStore);
      deleted += 1;
    }
    return { selected: records.length, deleted };
  };
}

async function deleteMedia(
  record: DeliveryMediaRecord,
  repository: DeliveryMediaRepository,
  objectStore: DeliveryMediaObjectStore,
) {
  await objectStore.delete(record.objectKey);
  if (!(await repository.deleteById!(record.id))) {
    throw new Error(`delivery media ${record.id} metadata was not deleted`);
  }
}
