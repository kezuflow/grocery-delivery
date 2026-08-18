import {
  createReconciliationDiscrepancy,
  type PaymentRepository,
  type ReconciliationDiscrepancy,
} from "./payments.js";
import type { PaymentProvider, ReconciliationEntry } from "./provider.js";

export type ReconciliationInput = Readonly<{
  from: string;
  to: string;
  now: string;
}>;

export type ReconciliationReport = Readonly<{
  providerName: string;
  from: string;
  to: string;
  providerEntryCount: number;
  discrepancyCount: number;
  discrepancies: readonly ReconciliationDiscrepancy[];
}>;

export class PaymentReconciliationService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly provider: PaymentProvider,
  ) {}

  async run(input: ReconciliationInput): Promise<ReconciliationReport> {
    const providerResult = await this.provider.reconcile({ from: input.from, to: input.to });
    const [attempts, refunds] = await Promise.all([
      this.repository.listPaymentAttempts(this.provider.name, input.from, input.to),
      this.repository.listRefunds(this.provider.name, input.from, input.to),
    ]);
    const localEntries = [
      ...attempts
        .filter((attempt) => attempt.providerReference)
        .map((attempt) => ({
          reference: attempt.providerReference!,
          type: "charge" as const,
          status: attempt.status,
          amount: attempt.amount,
          occurredAt: attempt.updatedAt,
        })),
      ...refunds
        .filter((refund) => refund.providerReference)
        .map((refund) => ({
          reference: refund.providerReference!,
          type: "refund" as const,
          status: refund.status,
          amount: refund.amount,
          occurredAt: refund.updatedAt,
        })),
    ];
    const discrepancies = compareEntries(
      localEntries,
      providerResult.entries,
      input.now,
      this.provider.name,
    );
    for (const discrepancy of discrepancies) {
      await this.repository.saveReconciliationDiscrepancy(discrepancy);
    }
    return {
      providerName: this.provider.name,
      from: input.from,
      to: input.to,
      providerEntryCount: providerResult.entries.length,
      discrepancyCount: discrepancies.length,
      discrepancies,
    };
  }
}

function compareEntries(
  localEntries: readonly ReconciliationEntry[],
  providerEntries: readonly ReconciliationEntry[],
  createdAt: string,
  providerName: string,
): readonly ReconciliationDiscrepancy[] {
  const localByReference = new Map(localEntries.map((entry) => [entry.reference, entry]));
  const providerByReference = new Map(providerEntries.map((entry) => [entry.reference, entry]));
  const discrepancies: ReconciliationDiscrepancy[] = [];

  for (const local of localEntries) {
    const provider = providerByReference.get(local.reference);
    if (!provider) {
      discrepancies.push(
        discrepancy({
          providerName,
          reference: local.reference,
          entityType: local.type,
          kind: "missing_provider_entry",
          expectedStatus: local.status,
          actualStatus: null,
          expectedAmount: local.amount,
          actualAmount: null,
          observedAt: local.occurredAt,
          createdAt,
        }),
      );
      continue;
    }
    if (local.status !== provider.status) {
      discrepancies.push(
        discrepancy({
          providerName,
          reference: local.reference,
          entityType: local.type,
          kind: "status_mismatch",
          expectedStatus: local.status,
          actualStatus: provider.status,
          expectedAmount: local.amount,
          actualAmount: provider.amount,
          observedAt: provider.occurredAt,
          createdAt,
        }),
      );
    }
    if (local.amount.centavos !== provider.amount.centavos) {
      discrepancies.push(
        discrepancy({
          providerName,
          reference: local.reference,
          entityType: local.type,
          kind: "amount_mismatch",
          expectedStatus: local.status,
          actualStatus: provider.status,
          expectedAmount: local.amount,
          actualAmount: provider.amount,
          observedAt: provider.occurredAt,
          createdAt,
        }),
      );
    }
  }

  for (const provider of providerEntries) {
    if (localByReference.has(provider.reference)) {
      continue;
    }
    discrepancies.push(
      discrepancy({
        providerName,
        reference: provider.reference,
        entityType: provider.type,
        kind: "unexpected_provider_entry",
        expectedStatus: null,
        actualStatus: provider.status,
        expectedAmount: null,
        actualAmount: provider.amount,
        observedAt: provider.occurredAt,
        createdAt,
      }),
    );
  }
  return discrepancies.sort((left, right) => left.id.localeCompare(right.id));
}

function discrepancy(input: Omit<ReconciliationDiscrepancy, "id">): ReconciliationDiscrepancy {
  return createReconciliationDiscrepancy({
    ...input,
    id: `reconciliation:${input.providerName}:${input.reference}:${input.kind}:${input.observedAt}`,
  });
}
