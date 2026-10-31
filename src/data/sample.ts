import { addDays, parseKey } from "@/domain/dates";
import { newHabit, type HabitInput } from "@/domain/habits";
import { entryFor } from "@/domain/schedule";
import { DEFAULT_SETTINGS, type DailyReflection, type FocusSession, type HabitLog, type LogIndex } from "@/domain/types";
import type { Snapshot } from "./schema";

// Sample data lives in its own storage namespace and is always shown with a
// "Sample data" banner, so it can never be mistaken for real records.

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PLAN: (HabitInput & { rate: number; hour: number })[] = [
  { title: "Move for 30 minutes", description: "", category: "Body", weight: 4, scheduleType: "daily", scheduledDays: [], weeklyTarget: null, preferredTime: "morning", rate: 0.82, hour: 7 },
  { title: "Deep work block", description: "90 minutes, no messages.", category: "Work", weight: 5, scheduleType: "weekdays", scheduledDays: [1, 2, 3, 4, 5], weeklyTarget: null, preferredTime: "morning", rate: 0.74, hour: 10 },
  { title: "Read 20 pages", description: "", category: "Mind", weight: 3, scheduleType: "daily", scheduledDays: [], weeklyTarget: null, preferredTime: "evening", rate: 0.66, hour: 21 },
  { title: "Meditate", description: "", category: "Mind", weight: 2, scheduleType: "daily", scheduledDays: [], weeklyTarget: null, preferredTime: "morning", rate: 0.58, hour: 6 },
  { title: "Sleep before 23:30", description: "", category: "Body", weight: 4, scheduleType: "daily", scheduledDays: [], weeklyTarget: null, preferredTime: "evening", rate: 0.61, hour: 23 },
  { title: "Long run", description: "", category: "Body", weight: 3, scheduleType: "weekly", scheduledDays: [], weeklyTarget: 2, preferredTime: "anytime", rate: 0.35, hour: 18 },
];

const NOTES = [
  "Slow start, strong finish. The morning block set the tone.",
  "Skipped reading — too late after dinner. Move it earlier.",
  "Good day. Training felt easy, focus held for the full block.",
  "Tired. Did the minimum and went to bed on time.",
  "Distracted in the afternoon; phone in another room helped.",
];

export function buildSample(today: string, days = 150): Snapshot {
  const rand = rng(20261030);
  const start = addDays(today, -days);
  const habits = PLAN.map((p, i) => {
    const h = newHabit(p, `sample-${i + 1}`, i, start, parseKey(start));
    return h;
  });

  const index: LogIndex = {};
  const logs: HabitLog[] = [];
  const ctx = { logs: index, today, weekStartsOn: 1 as const };

  for (let d = start; d < today; d = addDays(d, 1)) {
    // Consistency improves over time, with a dip mid-way.
    const t = (days - (parseKey(today).getTime() - parseKey(d).getTime()) / 86_400_000) / days;
    const drift = 0.82 + 0.25 * t - (t > 0.45 && t < 0.55 ? 0.25 : 0);
    habits.forEach((habit, i) => {
      const plan = PLAN[i]!;
      const e = entryFor(habit, d, ctx);
      if (!e) return;
      const chance = plan.scheduleType === "weekly" ? plan.rate : plan.rate * drift;
      if (rand() > Math.min(0.97, chance)) return;
      const minute = Math.max(0, Math.min(1439, Math.round((plan.hour + (rand() - 0.5) * 2.5) * 60)));
      const at = parseKey(d);
      at.setHours(Math.floor(minute / 60), minute % 60);
      const log: HabitLog = { id: `${habit.id}:${d}`, habitId: habit.id, date: d, status: "completed", completedAt: at.toISOString(), completionTime: minute };
      (index[d] ??= {})[habit.id] = log;
      logs.push(log);
    });
  }

  const reflections: DailyReflection[] = [];
  const focusSessions: FocusSession[] = [];
  for (let i = 1; i <= 40; i++) {
    const date = addDays(today, -i * 3);
    const at = parseKey(date).toISOString();
    reflections.push({
      id: `sample-r-${i}`,
      date,
      content: NOTES[i % NOTES.length]!,
      mood: (1 + Math.floor(rand() * 5)) as DailyReflection["mood"],
      createdAt: at,
      updatedAt: at,
    });
  }
  for (let i = 1; i <= 60; i++) {
    const date = addDays(today, -Math.floor(i * 1.6));
    focusSessions.push({ id: `sample-f-${i}`, date, duration: 1500, completedDuration: rand() > 0.15 ? 1500 : 900, sessionType: "work", completedAt: parseKey(date).toISOString() });
  }

  return { habits, logs, reflections, focusSessions, settings: { ...DEFAULT_SETTINGS, onboardingCompleted: true } };
}
