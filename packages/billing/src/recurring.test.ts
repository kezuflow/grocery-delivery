import { describe, expect, it } from "vitest";

import { createMoney } from "@carbon/domain";

import { FakePaymentProvider } from "./fake-provider.js";
import { DefaultPaymentService } from "./orchestration.js";
import { InMemoryPaymentRepository } from "./payments.js";
import { RecurringBillingService, retryDelaySeconds } from "./recurring.js";

describe("recurring billing", () => {
  const input = {
    customerId: "customer-1",
    orderId: "cycle-2026-08-22",
    customerReference: "provider-customer-1",
    paymentMethodReference: "provider-method-1",
    amount: createMoney(69900),
    idempotencyKey: "recurring-2026-08-22",
    now: "2026-08-20T10:00:00.000Z",
  } as const;

  it("marks recovered charges current and uses a distinct idempotent status command", async () => {
    const statuses: string[] = [];
    const service = new RecurringBillingService(
      new DefaultPaymentService(
        new InMemoryPaymentRepository(),
        new FakePaymentProvider({ now: () => new Date(input.now) }),
      ),
      (command) => {
        statuses.push(`${command.billingStatus}:${command.idempotencyKey}`);
        return Promise.resolve();
      },
    );
    await expect(service.charge(input)).resolves.toMatchObject({
      billingStatus: "current",
      retryable: false,
    });
    expect(statuses).toEqual(["current:recurring-2026-08-22:billing-current"]);
  });

  it("marks declined charges past due without throwing and does not retry them", async () => {
    const statuses: string[] = [];
    const service = new RecurringBillingService(
      new DefaultPaymentService(
        new InMemoryPaymentRepository(),
        new FakePaymentProvider({ declinedPaymentAttemptIds: ["attempt-1"] }),
        () => "attempt-1",
      ),
      (command) => {
        statuses.push(command.billingStatus);
        return Promise.resolve();
      },
    );
    await expect(service.charge(input)).resolves.toMatchObject({
      billingStatus: "past_due",
      retryable: false,
      attempt: { status: "failed" },
    });
    expect(statuses).toEqual(["past_due"]);
  });

  it("uses bounded exponential retry delays", () => {
    expect(retryDelaySeconds(1)).toBe(300);
    expect(retryDelaySeconds(3)).toBe(1200);
    expect(retryDelaySeconds(20)).toBe(86400);
    expect(() => retryDelaySeconds(0)).toThrow("positive integer");
  });
});
