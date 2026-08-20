import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import {
  createWeeklyOperationsDefinition,
  runWeeklyOperations,
  type WeeklyOperationsInput,
  type WeeklyOperationsStep,
} from "./weekly-operations.js";
import { createWeeklyOperationsScheduler, type WeeklyOperationsScheduler } from "./scheduler.js";

export * from "./weekly-operations.js";
export * from "./scheduler.js";

export type WorkflowEnvironment = Readonly<{
  WEEKLY_OPERATIONS?: WeeklyOperationsScheduler;
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
        async () => {
          await this.env.runStep?.(workflowStep, input);
          return {
            cycleId: input.cycleId,
            correlationId: input.correlationId,
            step: workflowStep.name,
          };
        },
      );
    });
    return definition;
  }
}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
  async scheduled(controller: ScheduledController, environment: WorkflowEnvironment) {
    if (!environment.WEEKLY_OPERATIONS) {
      throw new Error("weekly operations workflow binding is unavailable");
    }
    await createWeeklyOperationsScheduler(environment.WEEKLY_OPERATIONS)(controller.scheduledTime);
  },
} satisfies ExportedHandler<WorkflowEnvironment>;
