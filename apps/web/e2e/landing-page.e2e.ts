import {
  expect,
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
  test,
} from "./fixtures";

test("landing page presents the hero reveal", async ({ openAs, page }) => {
  await openAs(null, "/");

  await expect(page.getByRole("heading", { level: 1, name: "Good food, in its best light." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shop this week" })).toHaveAttribute("href", "/shop");
  await expect(page.locator('img[alt="A sculptural arrangement of fresh green vegetables"]')).toHaveAttribute(
    "src",
    /real\.webp/,
  );

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
