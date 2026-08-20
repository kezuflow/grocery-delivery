import { describe, expect, it } from "vitest";
import { InMemoryNotificationPreferencesRepository } from "./notification-preferences.js";

describe("notification preferences", () => {
  it("keeps preferences customer-scoped", async () => {
    const repository = new InMemoryNotificationPreferencesRepository();
    await repository.save({
      customerId: "customer-1",
      deliveryUpdates: false,
      marketing: true,
      updatedAt: "2026-08-20T10:00:00.000Z",
    });
    await expect(repository.get("customer-1")).resolves.toMatchObject({ marketing: true });
    await expect(repository.get("customer-2")).resolves.toBeNull();
  });
});
