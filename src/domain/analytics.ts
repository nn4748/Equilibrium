import { addDays, addMonths, daysInMonth, diffDays, eachDay, maxKey, startOfMonth, startOfWeek, weekdayOf } from "./dates";
import { entryFor } from "./schedule";
import type { History } from "./scoring";
import type { DateKey, Habit, LogIndex, Weekday } from "./types";

// Everything here is derived from stored logs. Functions return null or empty
// collections when there is no data, never placeholder values.

export interface PeriodScore {
  start: DateKey;
  label: string;
  score: number | null;
  completed: number;
  scheduled: number;
}

function aggregate(history: History, from: DateKey, to: DateKey) {
  let sum = 0;
  let n = 0;
  let completed = 0;
  let scheduled = 0;
  for (const d of eachDay(from, to)) {
    const m = history.days.get(d);
    if (!m) continue;
    completed += m.completedCount;
    scheduled += m.scheduledCount;
    if (m.balanceScore != null) {
      sum += m.balanceScore;
      n++;
    }
  }
  return { score: n ? sum / n : null, completed, scheduled };
}

export function weeklyScores(history: History, weeks: number, weekStartsOn: 0 | 1): PeriodScore[] {
  const current = startOfWeek(history.today, weekStartsOn);
  const out: PeriodScore[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(current, -7 * i);
    const end = addDays(start, 6) > history.today ? history.today : addDays(start, 6);
    out.push({ start, label: start.slice(5).replace("-", "."), ...aggregate(history, start, end) });
  }
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthlyScores(history: History, months: number): PeriodScore[] {
  const current = startOfMonth(history.today);
  const out: PeriodScore[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = addMonths(current, -i);
    const last = addDays(start, daysInMonth(start) - 1);
    const end = last > history.today ? history.today : last;
    out.push({ start, label: MONTHS[Number(start.slice(5, 7)) - 1]!, ...aggregate(history, start, end) });
  }
  return out;
}

export interface HabitPerformance {
  habit: Habit;
  rate: number;
  completed: number;
  due: number;
  /** Completion rate per week, oldest first; null for weeks with nothing due. */
  weekly: (number | null)[];
}

/** Completion rate per habit over the last `days` days (finished and current). */
export function habitPerformance(
  habits: readonly Habit[],
  logs: LogIndex,
  today: DateKey,
  weekStartsOn: 0 | 1,
  days = 30,
  weeks = 8,
): HabitPerformance[] {
  const ctx = { logs, today, weekStartsOn };
  const from = addDays(today, -(days - 1));
  const weekStart = addDays(startOfWeek(today, weekStartsOn), -7 * (weeks - 1));
  const out: HabitPerformance[] = [];
  for (const habit of habits) {
    let completed = 0;
    let due = 0;
    const wk = Array.from({ length: weeks }, () => ({ c: 0, d: 0 }));
    for (const d of eachDay(minDate(from, weekStart), today)) {
      const e = entryFor(habit, d, ctx);
      if (!e || !e.counted) continue;
      // An unfinished today only counts once it's done.
      if (d === today && e.status !== "completed") continue;
      const done = e.status === "completed" ? 1 : 0;
      if (d >= from) {
        due++;
        completed += done;
      }
      if (d >= weekStart) {
        const w = wk[Math.floor(diffDays(weekStart, d) / 7)]!;
        w.d++;
        w.c += done;
      }
    }
    if (due === 0) continue;
    out.push({ habit, rate: completed / due, completed, due, weekly: wk.map((w) => (w.d ? w.c / w.d : null)) });
  }
  return out.sort((a, b) => b.rate - a.rate || b.due - a.due);
}

function minDate(a: DateKey, b: DateKey) {
  return a < b ? a : b;
}

/** Completions by hour of day (24 bins), from recorded completion times. */
export function hourDistribution(logs: LogIndex, from?: DateKey): number[] {
  const bins = new Array<number>(24).fill(0);
  for (const [date, byHabit] of Object.entries(logs)) {
    if (from && date < from) continue;
    for (const log of Object.values(byHabit)) {
      if (log.status !== "completed") continue;
      bins[Math.min(23, Math.floor(log.completionTime / 60))]!++;
    }
  }
  return bins;
}

export interface WeekdayRate {
  weekday: Weekday;
  rate: number | null;
  completed: number;
  due: number;
}

/** Share of counted load completed on each weekday, finished days only. */
export function weekdayDistribution(history: History): WeekdayRate[] {
  const acc = Array.from({ length: 7 }, () => ({ c: 0, d: 0 }));
  for (const [date, m] of history.days) {
    if (date === history.today || m.scheduledCount === 0) continue;
    const a = acc[weekdayOf(date)]!;
    a.c += m.completedCount;
    a.d += m.scheduledCount;
  }
  return acc.map((a, i) => ({ weekday: i as Weekday, rate: a.d ? a.c / a.d : null, completed: a.c, due: a.d }));
}

/** Count of finished days in each balance-score band: 0–19, 20–39 … 80–99, 100. */
export function scoreBands(history: History): number[] {
  const bands = new Array<number>(6).fill(0);
  for (const [date, m] of history.days) {
    if (date === history.today || m.balanceScore === null) continue;
    bands[m.balanceScore >= 100 ? 5 : Math.floor(m.balanceScore / 20)]!++;
  }
  return bands;
}

export function scoreSeries(history: History, days: number): { date: DateKey; score: number | null }[] {
  if (!history.start) return [];
  const from = maxKey(history.start, addDays(history.today, -(days - 1)));
  return eachDay(from, history.today).map((date) => ({ date, score: history.days.get(date)?.balanceScore ?? null }));
}

export function categoryShare(habits: readonly Habit[], logs: LogIndex, from: DateKey): { category: string; count: number }[] {
  const byId = new Map(habits.map((h) => [h.id, h.category]));
  const counts = new Map<string, number>();
  for (const [date, byHabit] of Object.entries(logs)) {
    if (date < from) continue;
    for (const log of Object.values(byHabit)) {
      if (log.status !== "completed") continue;
      const cat = byId.get(log.habitId) ?? "Archived";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
  }
  return [...counts].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
}

/** Number of finished days with recorded load — used to gate charts behind enough data. */
export function trackedDays(history: History): number {
  let n = 0;
  for (const [date, m] of history.days) if (date !== history.today && m.totalWeight > 0) n++;
  return n;
}
