import { expect, test } from "./fixtures";

const campaigns = [
  {
    alt: "A cheerful shopper presenting a box of fresh produce",
    button: "Show featured offer 1: 40% off",
    name: /40% off your first order/,
  },
  {
    alt: "Hands packing a fresh produce box",
    button: "Show featured offer 2: Build your box",
    name: /Build your box your way/,
  },
  {
    alt: "A market grower holding a box of fresh produce",
    button: "Show featured offer 3: Market fresh",
    name: /Market fresh every week/,
  },
  {
    alt: "A bicycle courier carrying a produce delivery box",
    button: "Show featured offer 4: Weekend drops",
    name: /Weekend drops right on time/,
  },
  {
    alt: "A couple happily unpacking a box of fresh produce",
    button: "Show featured offer 5: One month free",
    name: /One month free to get started/,
  },
] as const;

test("featured campaign artwork stays inside gradient-free cards", async ({
  openAs,
  page,
}, testInfo) => {
  await openAs("customer", "/shop");
  const featuredOffers = page.getByRole("region", { name: "Featured offers" });
  const viewports =
    testInfo.project.name === "desktop"
      ? [
          { width: 1440, height: 1000 },
          { width: 1920, height: 1080 },
        ]
      : [page.viewportSize()];

  for (const viewport of viewports) {
    if (viewport) await page.setViewportSize(viewport);

    for (const campaign of campaigns) {
      await featuredOffers.getByRole("button", { name: campaign.button }).click();
      const offer = featuredOffers.getByRole("link", { name: campaign.name });
      const artwork = offer.getByRole("img", { name: campaign.alt });
      await expect(artwork).toBeVisible();

      const layout = await artwork.evaluate((image) => {
        const card = image.closest("a");
        if (!card) throw new Error("campaign artwork is missing its card");
        const cardRect = card.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();
        const hasGradient = [card, ...card.querySelectorAll("*")].some((element) =>
          getComputedStyle(element).backgroundImage.includes("gradient"),
        );
        return {
          card: {
            bottom: cardRect.bottom,
            left: cardRect.left,
            right: cardRect.right,
            top: cardRect.top,
          },
          hasGradient,
          image: {
            bottom: imageRect.bottom,
            left: imageRect.left,
            right: imageRect.right,
            top: imageRect.top,
          },
        };
      });

      expect(layout.hasGradient).toBe(false);
      expect(layout.image.top).toBeGreaterThanOrEqual(layout.card.top - 1);
      expect(layout.image.right).toBeLessThanOrEqual(layout.card.right + 1);
      expect(layout.image.bottom).toBeLessThanOrEqual(layout.card.bottom + 1);
      expect(layout.image.left).toBeGreaterThanOrEqual(layout.card.left - 1);
    }
  }
});
