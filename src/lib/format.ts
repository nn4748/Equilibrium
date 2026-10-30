const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** Day of year, 1-based, local calendar. */
export function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getFullYear(), 0, 1);
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return (today - start) / 86_400_000 + 1;
}

/** ISO-8601 week number. */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/** "2026.10.30" */
export function formatStamp(date: Date): string {
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

/** "D303 / W44" — the technical coordinate used across the interface. */
export function formatCoordinate(date: Date): string {
  return `D${pad(dayOfYear(date), 3)} / W${pad(isoWeek(date))}`;
}

export function formatLongDate(date: Date, locale?: string): string {
  return date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
}
