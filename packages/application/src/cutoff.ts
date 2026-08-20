import { getWeeklyCycleWindow } from "@carbon/domain";

export type CutoffDecision = Readonly<{ allowed: boolean; cutoffAt: string; cycleId: string }>;

export function evaluateOrderCutoff(now: Date): CutoffDecision {
  const cycle = getWeeklyCycleWindow(now);
  return {
    allowed: now.getTime() < Date.parse(cycle.cutoffAt),
    cutoffAt: cycle.cutoffAt,
    cycleId: cycle.id,
  };
}
