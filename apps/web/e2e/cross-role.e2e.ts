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
  await expect(page.getByRole("group", { name: "Fulfillment mode" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delivery", pressed: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pickup" })).toBeDisabled();
  await expect(
    page.getByRole("link", { name: /Deliver to 10 Market Street, Makati/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Your cart, 2 items" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Featured offers" })).toBeVisible();
  await expect(page.getByText("Crave it? Get it.")).toBeVisible();
  if (testInfo.project.name === "phone") {
    await expect(page.getByRole("navigation", { name: "Customer navigation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "My list" })).toBeVisible();
  } else if (testInfo.project.name === "desktop") {
    await expect(page.getByRole("navigation", { name: "Store aisles" })).toBeVisible();
    const collapseNavigation = page.getByRole("button", { name: "Collapse navigation" });
    await expect(collapseNavigation).toHaveAttribute("aria-expanded", "true");
    await collapseNavigation.click();
    await expect(page.getByRole("button", { name: "Expand navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(page.getByRole("link", { name: "Shop", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Expand navigation" }).click();
    await expect(page.getByRole("button", { name: "Collapse navigation" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
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

test("marketplace header search submits the server-backed query", async ({ openAs, page }) => {
  await openAs("customer", "/shop");
  const search = page.locator('input[type="search"]:visible').first();
  await expect(search).toHaveAttribute("placeholder", "Search Carbon Market");
  await search.fill("broccoli");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/shop\?search=broccoli$/);
  await expect(page.locator('input[type="search"]:visible').first()).toHaveValue("broccoli");
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("subscription onboarding preserves shopping context and persists activation", async ({
  context,
  page,
}, testInfo) => {
  if (testInfo.project.name === "desktop") {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  const scenario = `subscription-onboarding-${testInfo.project.name}`;
  await context.clearCookies();
  await context.addCookies([
    {
      name: "e2e-role",
      value: "customer",
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "e2e-scenario",
      value: scenario,
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/shop?search=oats");
  await page.getByRole("button", { name: "Add Rolled oats to cart" }).first().click();
  await expect(page).toHaveURL(/\/account\/subscribe\?returnTo=%2Fshop%3Fsearch%3Doats$/);
  await expect(page.getByRole("heading", { level: 1, name: "Choose a weekly plan" })).toBeVisible();
  await expect(page.getByText("Family weekly")).toBeVisible();
  await expect(page.getByText("₱199.00 / week")).toBeVisible();
  await expect(page.getByText(/₱1,500.00 in weekly grocery credit/)).toBeVisible();

  const plan = page.getByRole("radio", { name: /Family weekly/ });
  await plan.focus();
  await page.keyboard.press("Space");
  await expect(plan).toHaveAttribute("aria-checked", "true");
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);

  let failNextActivation = true;
  const idempotencyKeys: (string | undefined)[] = [];
  await page.route("**/api/v1/subscription/trial", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    idempotencyKeys.push(route.request().headers()["idempotency-key"]);
    if (failNextActivation) {
      failNextActivation = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "SUBSCRIPTION_UNAVAILABLE",
            message: "Trial activation is temporarily unavailable",
          },
          meta: { correlationId: "e2e-subscription-failure" },
        }),
      });
      return;
    }
    await route.continue();
  });

  const activate = page.getByRole("button", { name: "Activate plan and continue" });
  await activate.click();
  await expect(
    page.getByText("Trial activation is temporarily unavailable", { exact: true }),
  ).toBeVisible();
  await activate.click();
  await expect(page).toHaveURL(/\/shop\?search=oats$/);
  expect(idempotencyKeys).toHaveLength(2);
  expect(idempotencyKeys[0]).toBeTruthy();
  expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);

  await page.reload();
  await expect(page).toHaveURL(/\/shop\?search=oats$/);
  await expect(page.locator('input[type="search"]:visible').first()).toHaveValue("oats");
  await page.goto("/account/subscribe?returnTo=https%3A%2F%2Fexample.com");
  await expect(page.getByRole("heading", { name: "Your plan is ready" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to shopping" })).toHaveAttribute(
    "href",
    "/shop",
  );
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("checkout review resolves address, delivery time, and server coupon states", async ({
  openAs,
  page,
}, testInfo) => {
  if (testInfo.project.name === "desktop") {
    await page.setViewportSize({ width: 1920, height: 1080 });
  }
  await openAs("customer", "/account/checkout");
  await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Delivery address" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Delivery time" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Order summary" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Ada Customer - Office/ })).toBeVisible();

  const office = page.getByRole("button", { name: /Ada Customer - Office/ });
  await office.focus();
  await page.keyboard.press("Enter");
  await expect(office).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status")).toContainText("Delivery address updated");

  const afternoon = page.getByRole("button", { name: /Saturday 1:00 PM - 4:00 PM/ });
  await afternoon.click();
  await expect(afternoon).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("status")).toContainText("Delivery time updated");

  await page.getByRole("textbox", { name: "Coupon code" }).fill("NOPE");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("status")).toContainText("promotion code was not found");

  await page.getByRole("textbox", { name: "Coupon code" }).fill("WELCOME");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("WELCOME is applied")).toBeVisible();
  await expect(page.locator("dt").filter({ hasText: "Discount" }).locator("..")).toContainText(
    "-₱50.00",
  );
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("checkout explains missing address and delivery windows", async ({ context, page }) => {
  await context.clearCookies();
  await context.addCookies([
    {
      name: "e2e-role",
      value: "customer",
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "e2e-scenario",
      value: "checkout-empty-address-empty-windows",
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/account/checkout");
  await expect(page.getByText("No saved address is available")).toBeVisible();
  await expect(page.getByText("No delivery windows are available.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Place order/ })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Complete the active subscription");
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("checkout completes local payment and retries a declined charge", async ({
  context,
  page,
}) => {
  await context.clearCookies();
  await context.addCookies([
    {
      name: "e2e-role",
      value: "customer",
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "e2e-scenario",
      value: "payment-failure",
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("/account/checkout");
  await page.getByRole("button", { name: /Place order -/ }).click();
  await expect(page.getByRole("status")).toContainText("payment was declined");
  await expect(page.getByRole("button", { name: "Retry payment" })).toBeEnabled();
  await page.getByRole("button", { name: "Retry payment" }).click();
  await expect(page).toHaveURL(/\/account\/orders\/order-fixture-1\?payment=success$/);
  await expect(page.getByRole("heading", { name: "Order order-fixture-1" })).toBeVisible();
  await expect(page.getByText("paid").first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});

test("subscription onboarding explains an empty plan catalog", async ({ context, page }) => {
  await context.clearCookies();
  await context.addCookies([
    {
      name: "e2e-role",
      value: "customer",
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "e2e-scenario",
      value: "subscription-empty",
      url: "http://localhost:3100",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/account/subscribe?returnTo=%2Fshop");
  await expect(page.getByRole("heading", { name: "Choose a weekly plan" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Weekly plans are temporarily unavailable");
  await expect(page.getByRole("link", { name: "Back to shopping" })).toHaveAttribute(
    "href",
    "/shop",
  );
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

test("superadmin applies the approved catalog manifest", async ({ openAs, page }) => {
  await openAs("admin", "/admin/catalog");
  await expect(page.getByRole("link", { name: "Open launch configuration" })).toBeVisible();
  await page.getByRole("link", { name: "Open launch configuration" }).click();
  await page.getByLabel("Approval reason").fill("Approved local catalog verification");
  await page.getByLabel("Manifest JSON").fill(
    JSON.stringify({
      categories: [{ id: "fresh", name: "Fresh produce", slug: "fresh-produce", active: true }],
      skus: [
        {
          id: "sku-tomato",
          categoryId: "fresh",
          name: "Roma tomatoes",
          slug: "roma-tomatoes",
          description: "Ripe tomatoes for salads and sauces.",
          unit: "kilogram",
          imageUrl: null,
          procurementCostCentavos: 15000,
          markupBasisPoints: 2000,
          priceEffectiveAt: "2026-08-22T01:00:00.000Z",
          active: true,
        },
      ],
      deliveryWindows: [
        {
          id: "window-morning",
          cycleId: "cycle-2026-34",
          label: "Saturday morning",
          startsAt: "2026-08-29T01:00:00.000Z",
          endsAt: "2026-08-29T04:00:00.000Z",
          capacity: 20,
          active: true,
        },
      ],
    }),
  );
  await page.getByRole("button", { name: "Apply approved manifest" }).click();
  await expect(page.getByRole("status")).toContainText("Applied 1 categories, 1 SKUs");
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
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
