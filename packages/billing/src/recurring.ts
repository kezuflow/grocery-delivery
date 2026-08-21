import { PaymentProviderError } from "./provider.js";
import type { PaymentAttempt } from "./payments.js";
import type { PaymentService } from "./orchestration.js";

export type RecurringBillingInput = Readonly<{
  customerId: string;
  orderId: string;
  customerReference: string;
  paymentMethodReference: string;
  amount: Parameters<PaymentService["charge"]>[0]["amount"];
  idempotencyKey: string;
  now: string;
  trialEndsAt?: string | null;
}>;

export type RecurringBillingResult = Readonly<{
  attempt: PaymentAttempt | null;
  billingStatus: "current" | "past_due";
  retryable: boolean;
}>;

export type BillingStatusUpdater = (
  input: Readonly<{
    customerId: string;
    billingStatus: "current" | "past_due";
    idempotencyKey: string;
    now: string;
  }>,
) => Promise<unknown>;

/** Coordinates a weekly charge with the subscription's server-owned billing standing. */
export class RecurringBillingService {
  constructor(
    private readonly payments: PaymentService,
    private readonly updateBillingStatus: BillingStatusUpdater,
  ) {}

  async charge(input: RecurringBillingInput): Promise<RecurringBillingResult> {
    if (input.trialEndsAt && input.now < input.trialEndsAt) {
      return { attempt: null, billingStatus: "current", retryable: false };
    }
    try {
      const attempt = await this.payments.charge(input);
      if (attempt.status === "succeeded") {
        await this.updateBillingStatus({
          customerId: input.customerId,
          billingStatus: "current",
          idempotencyKey: `${input.idempotencyKey}:billing-current`,
          now: attempt.updatedAt,
        });
        return { attempt, billingStatus: "current", retryable: false };
      }
      await this.updateBillingStatus({
        customerId: input.customerId,
        billingStatus: "past_due",
        idempotencyKey: `${input.idempotencyKey}:billing-past-due`,
        now: attempt.updatedAt,
      });
      return { attempt, billingStatus: "past_due", retryable: attempt.status === "pending" };
    } catch (error) {
      await this.updateBillingStatus({
        customerId: input.customerId,
        billingStatus: "past_due",
        idempotencyKey: `${input.idempotencyKey}:billing-past-due`,
        now: input.now,
      });
      if (error instanceof PaymentProviderError) {
        return {
          attempt: null,
          billingStatus: "past_due",
          retryable: error.code.startsWith("PROVIDER_HTTP_"),
        };
      }
      throw error;
    }
  }
}

export function retryDelaySeconds(
  attempt: number,
  baseSeconds = 300,
  maximumSeconds = 86_400,
): number {
  if (!Number.isInteger(attempt) || attempt < 1)
    throw new Error("attempt must be a positive integer");
  return Math.min(maximumSeconds, baseSeconds * 2 ** (attempt - 1));
}
