import { getWeeklyCycleWindow } from "@carbon/domain";

import type { WeeklyOperationsInput } from "./weekly-operations.js";

export type WeeklyOperationsScheduler = Readonly<{
  createBatch(batch: Readonly<{ id: string; params: WeeklyOperationsInput }>[]): Promise<unknown[]>;
}>;

export function createWeeklyOperationsScheduler(
  workflow: WeeklyOperationsScheduler,
): (scheduledTime: number) => Promise<void> {
  return async (scheduledTime) => {
    const cycle = getWeeklyCycleWindow(new Date(scheduledTime));
    const correlationId = `weekly-operations:${cycle.id}`;
    await workflow.createBatch([
      {
        id: `weekly-operations-${cycle.id}`,
        params: { cycleId: cycle.id, correlationId },
      },
    ]);
  };
}
