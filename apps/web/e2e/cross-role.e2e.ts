import {
  expect,
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
  test,
} from "./fixtures";

const visualPages = [
  { name: "storefront", role: null, path: "/", heading: "Good food, planned around your week." },
  { name: "checkout", role: "customer" as const, path: "/account/checkout", heading: "Checkout" },
  { name: "admin-overview", role: "admin" as const, path: "/admin", heading: "Weekly operations" },
  {
    name: "delivery-detail",
    role: "deliveryman" as const,
    path: "/deliveryman/assignments/assignment-1",
    heading: "Order order-1",
  },
] as const;

for (const target of visualPages) {
  test(`${target.name} is responsive and accessible`, async ({ openAs, page }, testInfo) => {
    await openAs(target.role, target.path);
    await expect(page.getByRole("heading", { level: 1, name: target.heading })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoSeriousAccessibilityViolations(page);

    if (
      (testInfo.project.name === "phone" || testInfo.project.name === "desktop") &&
      target.name !== "storefront"
    ) {
      await expect(page).toHaveScreenshot(`${target.name}.png`, {
        animations: "disabled",
        fullPage: true,
      });
    }
  });
}

test("protected routes enforce session and role guards", async ({ openAs, page }) => {
  await openAs(null, "/account/catalog");
  await expect(page).toHaveURL(/\/unauthorized$/);

  await openAs("customer", "/admin");
  await expect(page).toHaveURL(/\/forbidden$/);

  await openAs("admin", "/deliveryman");
  await expect(page).toHaveURL(/\/forbidden$/);
});

test("keyboard focus and reduced motion remain usable", async ({ openAs, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openAs(null, "/");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  const styles = await page.evaluate(() => ({
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    transitionDuration: getComputedStyle(document.querySelector("a")!).transitionDuration,
  }));
  expect(styles.scrollBehavior).toBe("auto");
  expect(["1e-05s", "0s", "0.01ms"]).toContain(styles.transitionDuration);
});

test("delivery events persist in IndexedDB while offline", async ({ context, openAs, page }) => {
  await openAs("deliveryman", "/deliveryman/assignments/assignment-1");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Record delivered" }).click();
  const queued = await page.evaluate(async () => {
    const request = indexedDB.open("carbon-deliveryman");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise<number>((resolve, reject) => {
      const count = database.transaction("event-queue").objectStore("event-queue").count();
      count.onsuccess = () => resolve(count.result);
      count.onerror = () => reject(count.error);
    });
  });
  expect(queued).toBe(1);
  await context.setOffline(false);
});

test("web manifest is available", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({
    name: "Carbon Food Delivery",
    start_url: "/deliveryman",
  });
});
