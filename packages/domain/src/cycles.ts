import { DomainValidationError } from "./errors.js";

export const CYCLE_TIME_ZONE = "Asia/Manila" as const;
export const DEFAULT_CYCLE_CUTOFF_HOUR = 18;

export type WeeklyCycle = Readonly<{
  id: string;
  deliveryDate: string;
  cutoffAt: string;
  timeZone: typeof CYCLE_TIME_ZONE;
}>;

/** Returns the cycle for the local week before applying cutoff rollover. */
export function getWeeklyCycleWindow(
  now: Date,
  cutoffHour = DEFAULT_CYCLE_CUTOFF_HOUR,
): WeeklyCycle {
  if (Number.isNaN(now.getTime())) {
    throw new DomainValidationError("INVALID_CYCLE_TIME", "cycle assignment requires a valid date");
  }
  if (!Number.isInteger(cutoffHour) || cutoffHour < 0 || cutoffHour > 23) {
    throw new DomainValidationError("INVALID_CYCLE_CUTOFF", "cutoff hour must be from 0 to 23");
  }

  const local = manilaDateParts(now);
  const currentDate = new Date(Date.UTC(local.year, local.month - 1, local.day));
  const daysUntilSaturday = (6 - currentDate.getUTCDay() + 7) % 7;
  const deliveryDate = addDays(currentDate, daysUntilSaturday);
  return createWeeklyCycle(deliveryDate, cutoffHour);
}

export function assignWeeklyCycle(now: Date, cutoffHour = DEFAULT_CYCLE_CUTOFF_HOUR): WeeklyCycle {
  const cycle = getWeeklyCycleWindow(now, cutoffHour);

  if (now.getTime() < Date.parse(cycle.cutoffAt)) {
    return cycle;
  }

  return createWeeklyCycle(addDays(new Date(`${cycle.deliveryDate}T00:00:00.000Z`), 7), cutoffHour);
}

function createWeeklyCycle(deliveryDate: Date, cutoffHour: number): WeeklyCycle {
  const cutoffDate = addDays(deliveryDate, -1);
  const cutoffAt = manilaTimestamp(cutoffDate, cutoffHour);
  const deliveryDateText = isoDate(deliveryDate);

  return Object.freeze({
    id: `cycle-${deliveryDateText}`,
    deliveryDate: deliveryDateText,
    cutoffAt: cutoffAt.toISOString(),
    timeZone: CYCLE_TIME_ZONE,
  });
}

function manilaDateParts(value: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CYCLE_TIME_ZONE,
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
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour - 8));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
