import { addDays, eachDay, minKey } from "./dates";
import { createdKey, entriesFor, type DayEntry } from "./schedule";
import type { DailyMetrics, DateKey, Habit, LogIndex } from "./types";

export function metricsFromEntries(date: DateKey, entries: readonly DayEntry[]): DailyMetrics {
  let totalWeight = 0;
  let completedWeight = 0;
  let scheduledCount = 0;
  let completedCount = 0;
  for (const e of entries) {
    if (!e.counted) continue;
    totalWeight += e.weight;
    scheduledCount++;
    if (e.status === "completed") {
      completedWeight += e.weight;
      completedCount++;
    }
  }
  return {
    date,
    balanceScore: totalWeight > 0 ? (completedWeight / totalWeight) * 100 : null,
    completedWeight,
    totalWeight,
    completedCount,
    scheduledCount,
  };
}

export interface History {
  /** First day any habit existed, or null when there are no habits. */
  start: DateKey | null;
  today: DateKey;
  days: Map<DateKey, DailyMetrics>;
}

/** Metrics for every day from the first habit's creation through today. */
export function buildHistory(habits: readonly Habit[], logs: LogIndex, today: DateKey, weekStartsOn: 0 | 1): History {
  const days = new Map<DateKey, DailyMetrics>();
  if (habits.length === 0) return { start: null, today, days };
  let start = today;
  for (const h of habits) start = minKey(start, createdKey(h));
  const ctx = { logs, today, weekStartsOn };
  for (const date of eachDay(start, today)) {
    days.set(date, metricsFromEntries(date, entriesFor(habits, date, ctx)));
  }
  return { start, today, days };
}

/** Mean balance score across days with load in the `count` days ending at `end`. */
export function averageScore(history: History, end: DateKey, count: number): number | null {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < count; i++) {
    const m = history.days.get(addDays(end, -i));
    if (m?.balanceScore != null) {
      sum += m.balanceScore;
      n++;
    }
  }
  return n ? sum / n : null;
}

/**
 * Structural stress, 0–1: the share of load missed over the last `window`
 * finished days. Drives the deformation of the 3D model.
 */
export function stressOf(history: History, window = 7): number {
  let missed = 0;
  let total = 0;
  for (let i = 1; i <= window; i++) {
    const m = history.days.get(addDays(history.today, -i));
    if (!m) continue;
    missed += m.totalWeight - m.completedWeight;
    total += m.totalWeight;
  }
  return total ? missed / total : 0;
}
