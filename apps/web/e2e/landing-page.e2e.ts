import {
  expect,
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
  test,
} from "./fixtures";

test("landing page presents a hello world message", async ({ openAs, page }) => {
  await openAs(null, "/");

  await expect(page.getByRole("heading", { level: 1, name: "Hello world" })).toBeVisible();

  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
