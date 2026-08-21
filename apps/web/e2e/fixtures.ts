import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";

export const test = base.extend<{
  openAs: (role: "customer" | "admin" | "deliveryman" | null, path: string) => Promise<void>;
}>({
  openAs: async ({ context, page }, use) => {
    await use(async (role, path) => {
      await context.clearCookies();
      if (role) {
        await context.addCookies([
          {
            name: "e2e-role",
            value: role,
            url: "http://localhost:3100",
            httpOnly: true,
            sameSite: "Lax",
          },
        ]);
      }
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    });
  },
});

export { expect };

export async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 1);
}

export async function expectNoSeriousAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
}
