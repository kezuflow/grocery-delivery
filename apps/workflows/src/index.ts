import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import {
  createWeeklyOperationsDefinition,
  runWeeklyOperations,
  type WeeklyOperationsInput,
  type WeeklyOperationsStep,
} from "./weekly-operations.js";

export * from "./weekly-operations.js";

export type WorkflowEnvironment = Readonly<{
  runStep?: (step: WeeklyOperationsStep, input: WeeklyOperationsInput) => Promise<void>;
}>;

export class WeeklyOperationsWorkflow extends WorkflowEntrypoint<
  WorkflowEnvironment,
  WeeklyOperationsInput
> {
  override async run(event: Readonly<WorkflowEvent<WeeklyOperationsInput>>, step: WorkflowStep) {
    const definition = createWeeklyOperationsDefinition({
      ...event.payload,
      correlationId: event.payload.correlationId,
    });
    if (!this.env.runStep) return definition;

    await runWeeklyOperations(definition, async (workflowStep, input) => {
      await step.do(
        workflowStep.name,
        {
          retries: {
            limit: workflowStep.retry.limit,
            delay: `${workflowStep.retry.delaySeconds} seconds`,
            backoff: workflowStep.retry.backoff,
          },
        },
        () => this.env.runStep!(workflowStep, input),
      );
    });
    return definition;
  }
}
