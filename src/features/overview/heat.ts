import type { DailyMetrics } from "@/domain/types";
import { t } from "@/i18n";

/** Intensity 0–4 for a day with load; null when nothing was scheduled. */
export function heatLevel(m: DailyMetrics | undefined): number | null {
  if (!m || m.balanceScore === null) return null;
  const s = m.balanceScore;
  if (s >= 100) return 4;
  if (s >= 70) return 3;
  if (s >= 40) return 2;
  if (s > 0) return 1;
  return 0;
}

export const HEAT_LABELS = ["0", "1–39", "40–69", "70–99", "100"] as const;

export function describeDay(m: DailyMetrics | undefined): string {
  if (!m || m.balanceScore === null) return t("Nothing planned");
  return t("{done} of {total} done · {pct}%", { done: m.completedCount, total: m.scheduledCount, pct: Math.round(m.balanceScore) });
}
