import type { DateKey, Habit, ScheduleType, ScheduleVersion, TimeOfDay, Weekday, Weight } from "./types";

export interface HabitInput {
  title: string;
  description: string;
  category: string;
  weight: Weight;
  scheduleType: ScheduleType;
  scheduledDays: Weekday[];
  weeklyTarget: number | null;
  preferredTime: TimeOfDay;
}

export const CATEGORIES = ["Body", "Mind", "Work", "Craft", "Home", "Social"] as const;

export const EMPTY_INPUT: HabitInput = {
  title: "",
  description: "",
  category: "Body",
  weight: 3,
  scheduleType: "daily",
  scheduledDays: [1, 2, 3, 4, 5],
  weeklyTarget: 3,
  preferredTime: "anytime",
};

export function validateInput(input: HabitInput): Partial<Record<keyof HabitInput, string>> {
  const errors: Partial<Record<keyof HabitInput, string>> = {};
  const title = input.title.trim();
  if (!title) errors.title = "Give the habit a name.";
  else if (title.length > 60) errors.title = "Keep the name under 60 characters.";
  if (!input.category.trim()) errors.category = "Choose a category.";
  if (input.scheduleType === "weekdays" && input.scheduledDays.length === 0) errors.scheduledDays = "Pick at least one day.";
  if (input.scheduleType === "weekly" && !(input.weeklyTarget && input.weeklyTarget >= 1 && input.weeklyTarget <= 6))
    errors.weeklyTarget = "Choose between 1 and 6 times.";
  return errors;
}

function versionFrom(input: HabitInput, effectiveFrom: DateKey): ScheduleVersion {
  return {
    effectiveFrom,
    weight: input.weight,
    scheduleType: input.scheduleType,
    scheduledDays: input.scheduleType === "weekdays" ? [...input.scheduledDays].sort() : [],
    weeklyTarget: input.scheduleType === "weekly" ? input.weeklyTarget : null,
  };
}

export function newHabit(input: HabitInput, id: string, order: number, today: DateKey, now: Date): Habit {
  const v = versionFrom(input, today);
  return {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    preferredTime: input.preferredTime,
    order,
    createdAt: now.toISOString(),
    archivedAt: null,
    weight: v.weight,
    scheduleType: v.scheduleType,
    scheduledDays: v.scheduledDays,
    weeklyTarget: v.weeklyTarget,
    history: [v],
  };
}

function sameSchedule(a: ScheduleVersion, b: ScheduleVersion) {
  return (
    a.weight === b.weight &&
    a.scheduleType === b.scheduleType &&
    a.weeklyTarget === b.weeklyTarget &&
    a.scheduledDays.join() === b.scheduledDays.join()
  );
}

/**
 * Applies an edit. A change to schedule or weight starts a new schedule version
 * from today, so days already lived are still scored the way they were.
 */
export function applyEdit(habit: Habit, input: HabitInput, today: DateKey): Habit {
  const next = versionFrom(input, today);
  const last = habit.history[habit.history.length - 1]!;
  let history = habit.history;
  if (!sameSchedule(last, next)) {
    history = last.effectiveFrom === today ? [...habit.history.slice(0, -1), next] : [...habit.history, next];
  }
  return {
    ...habit,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    preferredTime: input.preferredTime,
    weight: next.weight,
    scheduleType: next.scheduleType,
    scheduledDays: next.scheduledDays,
    weeklyTarget: next.weeklyTarget,
    history,
  };
}

export function inputFrom(habit: Habit): HabitInput {
  return {
    title: habit.title,
    description: habit.description,
    category: habit.category,
    weight: habit.weight,
    scheduleType: habit.scheduleType,
    scheduledDays: habit.scheduleType === "weekdays" ? habit.scheduledDays : EMPTY_INPUT.scheduledDays,
    weeklyTarget: habit.weeklyTarget ?? EMPTY_INPUT.weeklyTarget,
    preferredTime: habit.preferredTime,
  };
}

export const SUGGESTIONS: readonly (Omit<HabitInput, "description" | "scheduledDays" | "weeklyTarget"> & { note: string })[] = [
  { title: "Move for 30 minutes", category: "Body", weight: 4, scheduleType: "daily", preferredTime: "morning", note: "Any training counts." },
  { title: "Read 20 pages", category: "Mind", weight: 3, scheduleType: "daily", preferredTime: "evening", note: "Books, not feeds." },
  { title: "Deep work block", category: "Work", weight: 5, scheduleType: "daily", preferredTime: "morning", note: "90 minutes, no messages." },
  { title: "Sleep before 23:30", category: "Body", weight: 4, scheduleType: "daily", preferredTime: "evening", note: "Lights out on time." },
  { title: "Meditate", category: "Mind", weight: 2, scheduleType: "daily", preferredTime: "morning", note: "Ten quiet minutes." },
  { title: "Write", category: "Craft", weight: 3, scheduleType: "daily", preferredTime: "anytime", note: "Journal, notes or drafts." },
  { title: "No phone after 22:00", category: "Mind", weight: 2, scheduleType: "daily", preferredTime: "evening", note: "Charge it outside the bedroom." },
  { title: "Call family", category: "Social", weight: 2, scheduleType: "weekly", preferredTime: "anytime", note: "Once or twice a week." },
];
