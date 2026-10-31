import { addDays, startOfWeek, toDateKey, weekdayOf } from "./dates";
import type { DateKey, Habit, LogIndex, ScheduleVersion } from "./types";

export function createdKey(habit: Habit): DateKey {
  return habit.history[0]?.effectiveFrom ?? toDateKey(new Date(habit.createdAt));
}

export function archivedKey(habit: Habit): DateKey | null {
  return habit.archivedAt ? toDateKey(new Date(habit.archivedAt)) : null;
}

/** Whether the habit existed on `date` (created on or before, not yet archived). */
export function isActiveOn(habit: Habit, date: DateKey): boolean {
  if (date < createdKey(habit)) return false;
  const archived = archivedKey(habit);
  return archived === null || date < archived;
}

/** The schedule in force on `date`. */
export function versionOn(habit: Habit, date: DateKey): ScheduleVersion {
  let current = habit.history[0]!;
  for (const v of habit.history) {
    if (v.effectiveFrom <= date) current = v;
    else break;
  }
  return current;
}

/**
 * How a habit stands on a given day.
 * - completed / skipped: a log exists
 * - pending: due today, not done yet
 * - missed: was due on a past day, not done
 * - optional: a weekly habit that isn't due yet (doesn't count toward the score)
 * - upcoming: a future day
 */
export type MemberStatus = "completed" | "skipped" | "pending" | "missed" | "optional" | "upcoming";

export interface DayEntry {
  habit: Habit;
  weight: number;
  status: MemberStatus;
  /** Whether this entry contributes to the day's load. */
  counted: boolean;
}

interface Context {
  logs: LogIndex;
  today: DateKey;
  weekStartsOn: 0 | 1;
}

function statusForDue(date: DateKey, today: DateKey): MemberStatus {
  if (date > today) return "upcoming";
  return date === today ? "pending" : "missed";
}

/**
 * Weekly-target habits are flexible: a completion counts on the day it happens.
 * The habit becomes due — counted, and missed if not done — once the days left
 * in the week (including this one) are no more than the completions still owed.
 */
function weeklyEntry(habit: Habit, version: ScheduleVersion, date: DateKey, ctx: Context): DayEntry {
  const weight = version.weight;
  const log = ctx.logs[date]?.[habit.id];
  if (log?.status === "completed") return { habit, weight, status: "completed", counted: true };
  if (log?.status === "skipped") return { habit, weight, status: "skipped", counted: false };

  const target = version.weeklyTarget ?? 1;
  const weekStart = startOfWeek(date, ctx.weekStartsOn);
  let before = 0;
  for (let d = weekStart; d < date; d = addDays(d, 1)) {
    if (ctx.logs[d]?.[habit.id]?.status === "completed") before++;
  }
  const weekEnd = addDays(weekStart, 6);
  let daysLeft = 0;
  for (let d = date; d <= weekEnd; d = addDays(d, 1)) {
    if (isActiveOn(habit, d)) daysLeft++;
  }
  const owed = target - before;
  if (owed > 0 && owed >= daysLeft) {
    const status = statusForDue(date, ctx.today);
    return { habit, weight, status, counted: status !== "upcoming" };
  }
  return { habit, weight, status: date > ctx.today ? "upcoming" : "optional", counted: false };
}

export function entryFor(habit: Habit, date: DateKey, ctx: Context): DayEntry | null {
  if (!isActiveOn(habit, date)) return null;
  const version = versionOn(habit, date);
  if (version.scheduleType === "weekly") return weeklyEntry(habit, version, date, ctx);
  if (version.scheduleType === "weekdays" && !version.scheduledDays.includes(weekdayOf(date))) return null;

  const weight = version.weight;
  const log = ctx.logs[date]?.[habit.id];
  if (log?.status === "completed") return { habit, weight, status: "completed", counted: true };
  if (log?.status === "skipped") return { habit, weight, status: "skipped", counted: false };
  const status = statusForDue(date, ctx.today);
  return { habit, weight, status, counted: status !== "upcoming" };
}

/** Every habit that appears on `date`, in display order. */
export function entriesFor(habits: readonly Habit[], date: DateKey, ctx: Context): DayEntry[] {
  const out: DayEntry[] = [];
  for (const habit of habits) {
    const entry = entryFor(habit, date, ctx);
    if (entry) out.push(entry);
  }
  return out;
}

export function describeSchedule(habit: Pick<Habit, "scheduleType" | "scheduledDays" | "weeklyTarget">): string {
  if (habit.scheduleType === "daily") return "Every day";
  if (habit.scheduleType === "weekly") return `${habit.weeklyTarget ?? 1}× per week`;
  const days = [...habit.scheduledDays].sort();
  if (days.length === 7) return "Every day";
  if (days.join() === "1,2,3,4,5") return "Weekdays";
  if (days.join() === "0,6") return "Weekends";
  return days.map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(" · ");
}
