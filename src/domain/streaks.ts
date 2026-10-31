import { addDays } from "./dates";
import type { History } from "./scoring";
import { createdKey, entryFor } from "./schedule";
import type { DateKey, Habit, LogIndex } from "./types";

export interface Streaks {
  current: number;
  longest: number;
  /** Day the longest streak ended. */
  longestEnd: DateKey | null;
}

/**
 * A day counts toward the streak when all of its load was completed.
 * Days with nothing scheduled neither extend nor break a streak.
 * An unfinished today doesn't break the current streak.
 */
export function balanceStreaks(history: History): Streaks {
  if (!history.start) return { current: 0, longest: 0, longestEnd: null };
  let run = 0;
  let longest = 0;
  let longestEnd: DateKey | null = null;
  for (let d = history.start; d <= history.today; d = addDays(d, 1)) {
    const m = history.days.get(d);
    if (!m || m.balanceScore === null) continue;
    if (m.balanceScore >= 100) {
      run++;
      if (run > longest) {
        longest = run;
        longestEnd = d;
      }
    } else if (d !== history.today) {
      run = 0;
    }
  }
  return { current: run, longest, longestEnd };
}

/** Consecutive completed occurrences of one habit, counting back from today. */
export function habitStreak(habit: Habit, logs: LogIndex, today: DateKey, weekStartsOn: 0 | 1): number {
  const ctx = { logs, today, weekStartsOn };
  const first = createdKey(habit);
  let run = 0;
  for (let d = today; d >= first; d = addDays(d, -1)) {
    const e = entryFor(habit, d, ctx);
    if (!e) continue;
    if (e.status === "completed") run++;
    else if (e.status === "missed") break;
  }
  return run;
}
