import {
  expect,
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
  test,
} from "./fixtures";

test("guest cart popup keeps the sign-in CTA readable", async ({ openAs, page }) => {
  await openAs(null, "/shop");
  await page.getByRole("button", { name: "Your cart", exact: true }).click();

  const cart = page.getByRole("dialog", { name: "Cart orders" });
  const signIn = cart.getByRole("link", { name: "Sign in to shop" });
  await expect(signIn).toBeVisible();
  await expect(signIn).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(signIn).toHaveCSS("color", "rgb(255, 255, 255)");
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
