import type { DateKey, Weekday } from "./types";

// All day arithmetic goes through calendar fields at local noon, never
// millisecond offsets, so DST transitions cannot add or drop a day.

const pad = (n: number) => String(n).padStart(2, "0");

export function keyFromParts(year: number, month: number, day: number): DateKey {
  const d = new Date(year, month, day, 12);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The calendar day `date` belongs to, given the hour a new day starts. */
export function toDateKey(date: Date, dayStartsAtHour = 0): DateKey {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() - dayStartsAtHour, date.getMinutes());
  return keyFromParts(shifted.getFullYear(), shifted.getMonth(), shifted.getDate());
}

export function todayKey(dayStartsAtHour = 0): DateKey {
  return toDateKey(new Date(), dayStartsAtHour);
}

export function parseKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12);
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseKey(value);
  return keyFromParts(d.getFullYear(), d.getMonth(), d.getDate()) === value;
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = parseKey(key);
  return keyFromParts(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

export function addMonths(key: DateKey, months: number): DateKey {
  const d = parseKey(key);
  return keyFromParts(d.getFullYear(), d.getMonth() + months, 1);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: DateKey, b: DateKey): number {
  const pa = parseKey(a);
  const pb = parseKey(b);
  return Math.round((Date.UTC(pb.getFullYear(), pb.getMonth(), pb.getDate()) - Date.UTC(pa.getFullYear(), pa.getMonth(), pa.getDate())) / 86_400_000);
}

export function weekdayOf(key: DateKey): Weekday {
  return parseKey(key).getDay() as Weekday;
}

export function startOfWeek(key: DateKey, weekStartsOn: 0 | 1): DateKey {
  const offset = (weekdayOf(key) - weekStartsOn + 7) % 7;
  return addDays(key, -offset);
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

export function daysInMonth(key: DateKey): number {
  const d = parseKey(key);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Inclusive range of keys. Empty when `to` precedes `from`. */
export function eachDay(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function minKey(a: DateKey, b: DateKey): DateKey {
  return a < b ? a : b;
}

export function maxKey(a: DateKey, b: DateKey): DateKey {
  return a > b ? a : b;
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
export function formatKey(key: DateKey, options: Intl.DateTimeFormatOptions): string {
  const id = JSON.stringify(options);
  let fmt = fmtCache.get(id);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-GB", options);
    fmtCache.set(id, fmt);
  }
  return fmt.format(parseKey(key));
}

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
