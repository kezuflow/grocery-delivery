import type {
  PaymentReconciliationService,
  ReconciliationInput,
  ReconciliationReport,
} from "@carbon/billing";

export type ReconciliationJobMessage = Readonly<{
  from: string;
  to: string;
}>;

export type ReconciliationRunner = Pick<PaymentReconciliationService, "run">;

export function createReconciliationJob(
  runner: ReconciliationRunner,
  now: () => Date = () => new Date(),
): (message: ReconciliationJobMessage) => Promise<ReconciliationReport> {
  return (message) => {
    const input: ReconciliationInput = {
      from: message.from,
      to: message.to,
      now: now().toISOString(),
    };
    return runner.run(input);
  };
}
