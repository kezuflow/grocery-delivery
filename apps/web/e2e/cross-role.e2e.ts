import {
  expect,
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
  test,
} from "./fixtures";

const visualPages = [
  { name: "storefront", role: null, path: "/", heading: "Carbon Food Delivery" },
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
  await openAs(null, "/shop");
  await expect(page).toHaveURL(/\/unauthorized$/);

  await openAs("customer", "/admin");
  await expect(page).toHaveURL(/\/forbidden$/);

  await openAs("admin", "/deliveryman");
  await expect(page).toHaveURL(/\/forbidden$/);

  await openAs("customer", "/admin/catalog");
  await expect(page).toHaveURL(/\/forbidden$/);
});

test("marketplace converges across phone and desktop layouts", async ({
  openAs,
  page,
}, testInfo) => {
  await openAs("customer", "/shop");
  await expect(page.getByRole("searchbox").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Best sellers" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Grocery", pressed: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Featured offers" })).toBeVisible();
  await expect(page.getByText("Crave it? Get it.")).toBeVisible();
  if (testInfo.project.name === "phone") {
    await expect(page.getByRole("navigation", { name: "Customer navigation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My list" })).toBeVisible();
  } else if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("navigation", { name: "Store aisles" })).toBeVisible();
    const rail = page.getByTestId("product-rail-best-sellers");
    const scrollRight = page.getByRole("button", { name: "Scroll Best sellers right" });
    const scrollLeft = page.getByRole("button", { name: "Scroll Best sellers left" });
    await expect(scrollLeft).toBeDisabled();
    await expect(scrollRight).toBeEnabled();
    await scrollRight.click();
    await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await expect(scrollLeft).toBeEnabled();
  }
  const bestSellers = page.getByTestId("product-row-best-sellers");
  await bestSellers.getByRole("button", { name: "See all" }).click();
  await expect(bestSellers.getByRole("button", { name: "Show less" })).toBeVisible();
  await expect(page.getByTestId("product-rail-best-sellers")).toHaveCSS("overflow-x", "visible");
  await expect(
    page
      .getByRole("button", {
        name: /Add Roma tomatoes to cart|Increase Quantity for Roma tomatoes/,
      })
      .first(),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("weekly cart mutations persist immediately and recover from a failed request", async ({
  openAs,
  page,
}) => {
  let failNextUpdate = true;
  await page.route("**/api/v1/cart", async (route) => {
    if (route.request().method() === "PUT" && failNextUpdate) {
      failNextUpdate = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "CART_UNAVAILABLE", message: "Cart updates are temporarily unavailable" },
          meta: { correlationId: "e2e-cart-failure" },
        }),
      });
      return;
    }
    await route.continue();
  });

  await openAs("customer", "/shop");
  const quantity = page.locator('input[aria-label="Quantity for Roma tomatoes"]').first();
  const initialQuantity = Number(await quantity.inputValue());
  await page.getByRole("button", { name: "Increase Quantity for Roma tomatoes" }).first().click();
  await expect(page.getByRole("button", { name: "Retry cart update" })).toBeVisible();
  await expect(quantity).toHaveValue(String(initialQuantity));

  await page.getByRole("button", { name: "Retry cart update" }).click();
  await expect(page.getByText("Cart updated.")).toBeVisible();
  await expect(quantity).toHaveValue(String(initialQuantity + 1));

  await page.reload();
  await expect(page.locator('input[aria-label="Quantity for Roma tomatoes"]').first()).toHaveValue(
    String(initialQuantity + 1),
  );
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("cart review supports keyboard quantity and substitution updates", async ({
  openAs,
  page,
}) => {
  await openAs("customer", "/account/cart");
  const substitution = page.getByRole("checkbox", {
    name: "Allow the best available substitute",
  });
  const initiallyChecked = await substitution.isChecked();
  await substitution.focus();
  await page.keyboard.press("Space");
  await expect(page.getByText("Cart updated.")).toBeVisible();
  if (initiallyChecked) {
    await expect(substitution).not.toBeChecked();
  } else {
    await expect(substitution).toBeChecked();
  }
  await expect(page.getByRole("button", { name: "Continue to checkout" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("empty weekly cart remains empty after reload", async ({ openAs, page }) => {
  await openAs("customer", "/account/cart");
  await page.locator('input[aria-label="Quantity for Roma tomatoes"]').fill("0");
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Browse catalog" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("admin product surfaces render server-backed states", async ({ openAs, page }) => {
  await openAs("admin", "/admin/catalog");
  await expect(page.getByRole("heading", { name: "Catalog control" })).toBeVisible();
  await expect(page.getByText("Roma tomatoes")).toBeVisible();

  await openAs("admin", "/admin/orders");
  await expect(page.getByRole("heading", { name: "Order fulfillment queue" })).toBeVisible();

  await openAs("admin", "/admin/staff");
  await expect(page.getByRole("heading", { name: "Assign server-owned role" })).toBeVisible();
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
