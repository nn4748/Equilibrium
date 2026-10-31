import { addDays } from "./dates";
import { entryFor } from "./schedule";
import type { DateKey, Habit, LogIndex } from "./types";

/**
 * Visual state of a structural member:
 * - completed: done today — solid, locked
 * - pending: due today, not done yet
 * - missed: the last time it was due, it wasn't done — wireframe, carries stress
 * - idle: not due today
 */
export type MemberState = "completed" | "pending" | "missed" | "idle";

export interface StructuralMember {
  id: string;
  label: string;
  weight: number;
  state: MemberState;
}

export function structuralMembers(habits: readonly Habit[], logs: LogIndex, today: DateKey, weekStartsOn: 0 | 1): StructuralMember[] {
  const ctx = { logs, today, weekStartsOn };
  return habits.map((habit) => {
    const now = entryFor(habit, today, ctx);
    let state: MemberState = "idle";
    if (now?.status === "completed") state = "completed";
    else {
      for (let i = 1; i <= 7; i++) {
        const e = entryFor(habit, addDays(today, -i), ctx);
        if (!e || !e.counted) continue;
        if (e.status === "missed") state = "missed";
        break;
      }
      if (state !== "missed" && now?.counted) state = "pending";
    }
    return { id: habit.id, label: habit.title, weight: now?.weight ?? habit.weight, state };
  });
}
