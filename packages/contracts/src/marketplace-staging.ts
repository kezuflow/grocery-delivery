import type { LaunchConfigurationApplyRequest } from "./launch-configuration";

const STAGING_IDEMPOTENCY_KEY = "staging-carbon-market-catalog-v1";
const STAGING_WEB_ORIGIN = "https://app-staging.getscenepass.com";
const MANILA_OFFSET_HOURS = 8;
const CUTOFF_HOUR = 18;

const categoryDefinitions = [
  ["fresh-produce", "Fresh produce"],
  ["fresh-herbs", "Fresh herbs"],
] as const;

const skuDefinitions = [
  [
    "fresh-produce",
    "apple",
    "Apples",
    "Crisp apples for snacks and lunchboxes.",
    "kilogram",
    14500,
    2500,
  ],
  [
    "fresh-produce",
    "tomatoes",
    "Roma tomatoes",
    "Firm tomatoes for salads and sauces.",
    "kilogram",
    7200,
    2400,
  ],
  [
    "fresh-produce",
    "carrots",
    "Carrots",
    "Sweet crunchy carrots for soups, salads, and roasting.",
    "kilogram",
    6800,
    2500,
  ],
  [
    "fresh-produce",
    "potatoes",
    "Potatoes",
    "Everyday potatoes for mashing, roasting, and stews.",
    "kilogram",
    7600,
    2500,
  ],
  [
    "fresh-produce",
    "red-onions",
    "Red onions",
    "Aromatic red onions for salads, salsas, and cooking.",
    "kilogram",
    9200,
    2500,
  ],
  [
    "fresh-produce",
    "white-onions",
    "White onions",
    "Clean, savory onions for everyday cooking.",
    "kilogram",
    8500,
    2500,
  ],
  [
    "fresh-produce",
    "garlic",
    "Garlic",
    "Fragrant garlic bulbs for marinades and sauces.",
    "pack",
    6500,
    2800,
  ],
  [
    "fresh-produce",
    "ginger",
    "Ginger",
    "Fresh ginger root for tea, stir-fries, and broths.",
    "pack",
    5800,
    2800,
  ],
  [
    "fresh-produce",
    "eggplant",
    "Eggplant",
    "Glossy eggplant for grilling, stews, and Filipino dishes.",
    "kilogram",
    7800,
    2600,
  ],
  [
    "fresh-produce",
    "cucumber",
    "Cucumber",
    "Cool, crisp cucumbers for salads and sandwiches.",
    "kilogram",
    8200,
    2600,
  ],
  [
    "fresh-produce",
    "bell-peppers",
    "Bell peppers",
    "Colorful sweet peppers for roasting and stir-fries.",
    "pack",
    12500,
    2600,
  ],
  [
    "fresh-produce",
    "broccoli",
    "Broccoli",
    "Fresh broccoli crowns with tender florets.",
    "kilogram",
    13500,
    2600,
  ],
  [
    "fresh-produce",
    "cauliflower",
    "Cauliflower",
    "Versatile cauliflower for roasting, rice, and soups.",
    "kilogram",
    12800,
    2600,
  ],
  [
    "fresh-produce",
    "cabbage",
    "Cabbage",
    "Crisp green cabbage for slaws, soups, and stir-fries.",
    "kilogram",
    6200,
    2600,
  ],
  [
    "fresh-produce",
    "green-beans",
    "Green beans",
    "Tender green beans for quick sides and salads.",
    "pack",
    8800,
    2700,
  ],
  [
    "fresh-produce",
    "lettuce",
    "Lettuce",
    "Crisp salad lettuce, washed and ready to serve.",
    "pack",
    7200,
    2700,
  ],
  [
    "fresh-produce",
    "pechay",
    "Pechay",
    "Fresh pechay for soups, noodles, and stir-fries.",
    "pack",
    6500,
    2700,
  ],
  [
    "fresh-produce",
    "kangkong",
    "Kangkong",
    "Tender water spinach for savory Filipino dishes.",
    "pack",
    5900,
    2700,
  ],
  [
    "fresh-produce",
    "chili-peppers",
    "Chili peppers",
    "Bright chili peppers for heat and flavor.",
    "pack",
    6200,
    2800,
  ],
  [
    "fresh-herbs",
    "basil",
    "Fresh basil",
    "Fragrant basil for pasta, salads, and sauces.",
    "pack",
    4500,
    2800,
  ],
  [
    "fresh-herbs",
    "cilantro",
    "Fresh cilantro",
    "Fresh cilantro for salsas, soups, and garnishes.",
    "pack",
    4200,
    2800,
  ],
  [
    "fresh-herbs",
    "spring-onions",
    "Spring onions",
    "Fresh spring onions for finishing noodles and salads.",
    "pack",
    4800,
    2800,
  ],
] as const;

export type StagingCarbonMarketManifestOptions = Readonly<{
  now?: Date;
  appliedAt?: string;
  webOrigin?: string;
}>;

export function createStagingCarbonMarketManifest(
  options: StagingCarbonMarketManifestOptions = {},
): LaunchConfigurationApplyRequest {
  const now = options.now ?? new Date();
  const appliedAt = options.appliedAt ?? now.toISOString();
  const webOrigin = options.webOrigin ?? STAGING_WEB_ORIGIN;
  const deliveryDate = resolveDeliveryDate(now);
  const cycleId = `cycle-${formatDate(deliveryDate)}`;
  const categories = categoryDefinitions.map(([slug, name]) => ({
    id: slug,
    name,
    slug,
    active: true,
  }));
  const skus = skuDefinitions.map(([categoryId, slug, name, description, unit, cost, markup]) => ({
    id: `carbon-market-${slug}`,
    categoryId,
    name,
    slug,
    description,
    unit,
    imageUrl: `${webOrigin}/marketplace/${slug}.webp`,
    procurementCostCentavos: cost,
    markupBasisPoints: markup,
    priceEffectiveAt: appliedAt,
    active: true,
  }));
  const deliveryWindows = [
    createWindow(cycleId, deliveryDate, "saturday-morning", "Saturday 8:00 AM - 12:00 PM", 8, 12),
    createWindow(cycleId, deliveryDate, "saturday-afternoon", "Saturday 1:00 PM - 5:00 PM", 13, 17),
    createWindow(
      cycleId,
      addDays(deliveryDate, 1),
      "sunday-morning",
      "Sunday 8:00 AM - 12:00 PM",
      8,
      12,
    ),
    createWindow(
      cycleId,
      addDays(deliveryDate, 1),
      "sunday-afternoon",
      "Sunday 1:00 PM - 5:00 PM",
      13,
      17,
    ),
  ];
  return {
    reason: "VS-MKT-00 Carbon Market vegetable catalog v1",
    categories,
    skus,
    deliveryWindows,
  };
}

export const STAGING_CARBON_MARKET_IDEMPOTENCY_KEY = STAGING_IDEMPOTENCY_KEY;

function resolveDeliveryDate(now: Date): Date {
  const local = manilaDateParts(now);
  const date = new Date(Date.UTC(local.year, local.month - 1, local.day));
  const saturday = addDays(date, (6 - date.getUTCDay() + 7) % 7);
  const cutoffAt = Date.UTC(
    saturday.getUTCFullYear(),
    saturday.getUTCMonth(),
    saturday.getUTCDate() - 1,
    CUTOFF_HOUR - MANILA_OFFSET_HOURS,
  );
  return now.getTime() < cutoffAt ? saturday : addDays(saturday, 7);
}

function createWindow(
  cycleId: string,
  date: Date,
  slug: string,
  label: string,
  startHour: number,
  endHour: number,
) {
  return {
    id: `carbon-market-${cycleId}-${slug}`,
    cycleId,
    label,
    startsAt: manilaTimestamp(date, startHour).toISOString(),
    endsAt: manilaTimestamp(date, endHour).toISOString(),
    capacity: 80,
    active: true,
  };
}

function manilaDateParts(value: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
  };
}

function manilaTimestamp(date: Date, hour: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hour - MANILA_OFFSET_HOURS,
    ),
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
