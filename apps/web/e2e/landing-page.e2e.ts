import {
  expect,
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
  test,
} from "./fixtures";

test("landing page presents the weekly market journey accessibly", async ({ openAs, page }) => {
  await openAs(null, "/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Market mornings, delivered to your week." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Shop this week" }).first()).toBeVisible();

  const hero = page.getByRole("img", {
    name: "Fresh produce arranged at Carbon Market in the early morning",
  });
  await expect(hero).toBeVisible();
  await expect(hero).toHaveJSProperty("naturalWidth", 1672);

  const featuredTomatoes = page.getByRole("link", { name: "View Roma tomatoes, ₱180.00" });
  await expect(featuredTomatoes).toHaveAttribute("href", "/shop/roma-tomatoes");

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
