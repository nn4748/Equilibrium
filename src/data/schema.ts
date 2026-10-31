import type { DailyReflection, FocusSession, Habit, HabitLog, UserSettings } from "@/domain/types";

export const SCHEMA_VERSION = 1;

/** Everything Equilibrium stores. Portable: logs are a flat list here. */
export interface Snapshot {
  habits: Habit[];
  logs: HabitLog[];
  reflections: DailyReflection[];
  focusSessions: FocusSession[];
  settings: UserSettings;
}

/** On-disk and export format. */
export interface Envelope {
  app: "equilibrium";
  schemaVersion: number;
  exportedAt: string;
  data: Snapshot;
}

type Migration = (data: unknown) => unknown;

/** migrations[n] upgrades data from version n to n + 1. */
const migrations: Record<number, Migration> = {};

export function migrate(data: unknown, fromVersion: number): unknown {
  let current = data;
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const step = migrations[v];
    if (!step) throw new Error(`No migration from version ${v}.`);
    current = step(current);
  }
  return current;
}
