import {
  expect,
  expectNoHorizontalOverflow,
  expectNoSeriousAccessibilityViolations,
  test,
} from "./fixtures";

test("marketplace header keeps one visual language across responsive layouts", async ({
  openAs,
  page,
}, testInfo) => {
  await openAs("customer", "/shop");

  const header = page.locator(".marketplace-shell > header");
  await expect(header).toHaveCSS("background-color", "rgb(255, 255, 255)");

  const responsiveHeader = page.getByTestId("responsive-marketplace-header");
  const desktopHeader = page.getByTestId("desktop-marketplace-header");

  if (testInfo.project.name === "desktop") {
    await expect(desktopHeader).toBeVisible();
    await expect(responsiveHeader).toBeHidden();
  } else {
    await expect(responsiveHeader).toBeVisible();
    await expect(responsiveHeader).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(desktopHeader).toBeHidden();
    const headerRow = page.getByTestId("responsive-marketplace-header-row");
    await expect(headerRow).toHaveCSS("flex-direction", "row");
    await expect(
      responsiveHeader.getByRole("link", { name: "freshmarkets", exact: true }),
    ).toBeVisible();
    const accountButton = page.getByRole("button", { name: "Open account menu" });
    await expect(accountButton).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to stores" })).toHaveCount(0);

    const headerWidth = await responsiveHeader.evaluate((element) =>
      Math.round(element.getBoundingClientRect().width),
    );
    const contentWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(headerWidth).toBe(contentWidth);

    await accountButton.click();
    const accountDialog = page.getByRole("dialog", { name: "Account menu" });
    await expect(accountDialog).toBeVisible();
    await accountDialog.getByRole("button", { name: "Close account menu" }).click();
    await expect(accountDialog).toHaveCount(0);
  }

  await expect(page.locator('input[placeholder="Search freshmarkets"]:visible')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoSeriousAccessibilityViolations(page);
});
