export type WeeklyOperationsInput = Readonly<{
  cycleId: string;
  correlationId: string;
}>;

export type WorkflowRetryPolicy = Readonly<{
  limit: number;
  backoff: "exponential";
  delaySeconds: number;
}>;

export type WeeklyOperationsStep = Readonly<{
  name:
    "procurement-demand" | "procurement-exceptions" | "packing" | "dispatch" | "delivery-summary";
  retry: WorkflowRetryPolicy;
}>;

export type WeeklyOperationsDefinition = Readonly<{
  name: "weekly-operations";
  input: WeeklyOperationsInput;
  steps: readonly WeeklyOperationsStep[];
}>;

const DEFAULT_RETRY: WorkflowRetryPolicy = Object.freeze({
  limit: 3,
  backoff: "exponential",
  delaySeconds: 30,
});

const STEP_NAMES: readonly WeeklyOperationsStep["name"][] = [
  "procurement-demand",
  "procurement-exceptions",
  "packing",
  "dispatch",
  "delivery-summary",
];

export function createWeeklyOperationsDefinition(
  input: WeeklyOperationsInput,
  retry: WorkflowRetryPolicy = DEFAULT_RETRY,
): WeeklyOperationsDefinition {
  if (!input.cycleId.trim()) throw new Error("workflow cycleId is required");
  if (!input.correlationId.trim()) throw new Error("workflow correlationId is required");
  if (!Number.isSafeInteger(retry.limit) || retry.limit < 1) {
    throw new Error("workflow retry limit must be positive");
  }
  if (!Number.isSafeInteger(retry.delaySeconds) || retry.delaySeconds < 1) {
    throw new Error("workflow retry delay must be positive");
  }

  return Object.freeze({
    name: "weekly-operations",
    input: Object.freeze({ ...input }),
    steps: Object.freeze(
      STEP_NAMES.map((name) => Object.freeze({ name, retry: Object.freeze({ ...retry }) })),
    ),
  });
}

export type WeeklyOperationsStepRunner = (
  step: WeeklyOperationsStep,
  input: WeeklyOperationsInput,
) => Promise<void>;

export async function runWeeklyOperations(
  definition: WeeklyOperationsDefinition,
  runner: WeeklyOperationsStepRunner,
): Promise<void> {
  for (const step of definition.steps) await runner(step, definition.input);
}
