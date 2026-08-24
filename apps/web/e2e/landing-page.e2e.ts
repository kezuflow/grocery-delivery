import {
  expect,
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
  test,
} from "./fixtures";

test("landing page presents the FreshMarkets storefront", async ({ openAs, page }) => {
  await openAs(null, "/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Good food. Better value." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Build your basket" })).toHaveAttribute(
    "href",
    "/shop",
  );
  await expect(page.getByRole("link", { name: "FreshMarkets home" }).first()).toBeVisible();
  await expect(page.locator('img[src="/landing/background.webp"]')).toBeVisible();

  if ((await page.evaluate(() => window.innerWidth)) <= 900) {
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("button", { name: "Close navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close navigation" }).click();
  } else {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  }

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
