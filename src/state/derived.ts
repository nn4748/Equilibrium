"use client";

import { entriesFor, type DayEntry } from "@/domain/schedule";
import { buildHistory, metricsFromEntries, stressOf, type History } from "@/domain/scoring";
import { structuralMembers, type StructuralMember } from "@/domain/structure";
import type { DailyMetrics, DateKey, Habit, LogIndex } from "@/domain/types";
import { useData } from "./store";

// Derived data is cached on the identity of its inputs, so every component
// reading it shares one computation per change.

function memoOne<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  let lastArgs: A | null = null;
  let lastResult: R;
  return (...args: A) => {
    if (lastArgs && args.length === lastArgs.length && args.every((a, i) => Object.is(a, lastArgs![i]))) return lastResult;
    lastArgs = args;
    lastResult = fn(...args);
    return lastResult;
  };
}

const historyOf = memoOne((habits: Habit[], logs: LogIndex, today: DateKey, weekStartsOn: 0 | 1) => buildHistory(habits, logs, today, weekStartsOn));

export function useHistory(): History {
  const habits = useData((s) => s.habits);
  const logs = useData((s) => s.logs);
  const today = useData((s) => s.today);
  const weekStartsOn = useData((s) => s.settings.preferences.weekStartsOn);
  return historyOf(habits, logs, today, weekStartsOn);
}

const activeOf = memoOne((habits: Habit[]) => habits.filter((h) => !h.archivedAt));
const archivedOf = memoOne((habits: Habit[]) => habits.filter((h) => h.archivedAt));

export function useActiveHabits(): Habit[] {
  return activeOf(useData((s) => s.habits));
}

export function useArchivedHabits(): Habit[] {
  return archivedOf(useData((s) => s.habits));
}

const dayOf = memoOne((habits: Habit[], logs: LogIndex, date: DateKey, today: DateKey, weekStartsOn: 0 | 1) => {
  const entries = entriesFor(habits, date, { logs, today, weekStartsOn });
  return { entries, metrics: metricsFromEntries(date, entries) };
});

export function useDay(date?: DateKey): { entries: DayEntry[]; metrics: DailyMetrics } {
  const habits = useData((s) => s.habits);
  const logs = useData((s) => s.logs);
  const today = useData((s) => s.today);
  const weekStartsOn = useData((s) => s.settings.preferences.weekStartsOn);
  return dayOf(habits, logs, date ?? today, today, weekStartsOn);
}

export interface StructureState {
  members: StructuralMember[];
  stress: number;
  equilibrium: boolean;
}

const structureOf = memoOne((active: Habit[], logs: LogIndex, today: DateKey, weekStartsOn: 0 | 1, history: History, metrics: DailyMetrics): StructureState => {
  const equilibrium = metrics.totalWeight > 0 && metrics.completedWeight === metrics.totalWeight;
  // A fully carried day levels the structure, whatever the past week looked like.
  return { members: structuralMembers(active, logs, today, weekStartsOn), stress: equilibrium ? 0 : stressOf(history), equilibrium };
});

export function useStructure(): StructureState {
  const active = useActiveHabits();
  const logs = useData((s) => s.logs);
  const today = useData((s) => s.today);
  const weekStartsOn = useData((s) => s.settings.preferences.weekStartsOn);
  const history = useHistory();
  const { metrics } = useDay();
  return structureOf(active, logs, today, weekStartsOn, history, metrics);
}
