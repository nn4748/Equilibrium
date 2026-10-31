import { describe, expect, it } from "vitest";
import { toEnvelope } from "@/data/adapter";
import { buildSample } from "@/data/sample";
import { parseEnvelope, ValidationError } from "@/data/validate";
import { addDays, diffDays, eachDay, isDateKey, startOfWeek, toDateKey } from "./dates";
import { applyEdit, EMPTY_INPUT, newHabit, type HabitInput } from "./habits";
import { entryFor } from "./schedule";
import { averageScore, buildHistory, stressOf } from "./scoring";
import { balanceStreaks, habitStreak } from "./streaks";
import { structuralMembers } from "./structure";
import type { HabitLog, LogIndex } from "./types";

const input = (patch: Partial<HabitInput> = {}): HabitInput => ({ ...EMPTY_INPUT, title: "Test", ...patch });
const make = (id: string, created: string, patch: Partial<HabitInput> = {}) => newHabit(input(patch), id, 0, created, new Date(`${created}T09:00:00`));

function logs(entries: [string, string][]): LogIndex {
  const index: LogIndex = {};
  for (const [habitId, date] of entries) {
    const l: HabitLog = { id: `${habitId}:${date}`, habitId, date, status: "completed", completedAt: `${date}T10:00:00.000Z`, completionTime: 600 };
    (index[date] ??= {})[habitId] = l;
  }
  return index;
}

describe("dates", () => {
  it("walks calendar days across DST changes", () => {
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 3)).toBe("2026-10-27");
    expect(diffDays("2026-03-01", "2026-04-01")).toBe(31);
    expect(eachDay("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  });

  it("applies the day-start hour", () => {
    expect(toDateKey(new Date(2026, 9, 31, 1, 30), 0)).toBe("2026-10-31");
    expect(toDateKey(new Date(2026, 9, 31, 1, 30), 3)).toBe("2026-10-30");
  });

  it("finds the start of week", () => {
    expect(startOfWeek("2026-10-31", 1)).toBe("2026-10-26"); // Saturday → Monday
    expect(startOfWeek("2026-10-31", 0)).toBe("2026-10-25");
  });

  it("validates date keys", () => {
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(isDateKey("2026-1-01")).toBe(false);
  });
});

describe("schedule", () => {
  const today = "2026-10-28"; // Wednesday
  const ctx = (l: LogIndex = {}) => ({ logs: l, today, weekStartsOn: 1 as const });

  it("marks past unlogged days as missed and today as pending", () => {
    const h = make("a", "2026-10-26");
    expect(entryFor(h, "2026-10-27", ctx())?.status).toBe("missed");
    expect(entryFor(h, today, ctx())?.status).toBe("pending");
    expect(entryFor(h, "2026-10-25", ctx())).toBeNull(); // before creation
  });

  it("respects weekday schedules", () => {
    const h = make("a", "2026-10-01", { scheduleType: "weekdays", scheduledDays: [1, 3] });
    expect(entryFor(h, "2026-10-26", ctx())).not.toBeNull(); // Monday
    expect(entryFor(h, "2026-10-27", ctx())).toBeNull(); // Tuesday
  });

  it("treats weekly targets as optional until they become due", () => {
    const h = make("w", "2026-10-01", { scheduleType: "weekly", weeklyTarget: 2 });
    const c = { logs: {}, today: "2026-11-01", weekStartsOn: 1 as const }; // Sunday ends the week
    // Mon–Fri: plenty of days left → optional, not counted.
    expect(entryFor(h, "2026-10-26", c)).toMatchObject({ status: "optional", counted: false });
    // Saturday: 2 owed, 2 days left → due and, being past, missed.
    expect(entryFor(h, "2026-10-31", c)).toMatchObject({ status: "missed", counted: true });
    // One completion on Monday leaves 1 owed; only Sunday becomes due.
    const withOne = { ...c, logs: logs([["w", "2026-10-26"]]) };
    expect(entryFor(h, "2026-10-26", withOne)).toMatchObject({ status: "completed", counted: true });
    expect(entryFor(h, "2026-10-31", withOne)?.counted).toBe(false);
    expect(entryFor(h, "2026-11-01", withOne)).toMatchObject({ status: "pending", counted: true });
  });

  it("keeps past days on the old schedule after an edit", () => {
    const h = make("a", "2026-10-01", { weight: 2 });
    const edited = applyEdit(h, input({ weight: 5, scheduleType: "weekdays", scheduledDays: [1] }), "2026-10-20");
    expect(edited.history).toHaveLength(2);
    expect(entryFor(edited, "2026-10-14", ctx())?.weight).toBe(2); // Wednesday, old daily schedule
    expect(entryFor(edited, "2026-10-21", ctx())).toBeNull(); // Wednesday, new Mondays-only schedule
    expect(entryFor(edited, "2026-10-26", ctx())?.weight).toBe(5);
    // A second edit on the same day replaces that day's version.
    expect(applyEdit(edited, input({ weight: 4 }), "2026-10-20").history).toHaveLength(2);
  });

  it("hides archived habits from the archive date on", () => {
    const h = { ...make("a", "2026-10-01"), archivedAt: new Date("2026-10-27T12:00:00").toISOString() };
    expect(entryFor(h, "2026-10-26", ctx())).not.toBeNull();
    expect(entryFor(h, "2026-10-27", ctx())).toBeNull();
  });
});

describe("scoring", () => {
  const today = "2026-10-28";
  const heavy = make("h", "2026-10-26", { weight: 5 });
  const light = make("l", "2026-10-26", { weight: 1 });
  const l = logs([
    ["h", "2026-10-26"],
    ["l", "2026-10-26"],
    ["h", "2026-10-27"],
    ["l", "2026-10-28"],
  ]);
  const history = buildHistory([heavy, light], l, today, 1);

  it("weights completion by load", () => {
    expect(history.days.get("2026-10-26")?.balanceScore).toBe(100);
    expect(history.days.get("2026-10-27")?.balanceScore).toBeCloseTo((5 / 6) * 100);
    expect(history.days.get("2026-10-28")).toMatchObject({ completedWeight: 1, totalWeight: 6, completedCount: 1, scheduledCount: 2 });
  });

  it("averages only days with load", () => {
    expect(averageScore(history, today, 7)).toBeCloseTo((100 + (5 / 6) * 100 + (1 / 6) * 100) / 3);
  });

  it("measures stress from finished days", () => {
    expect(stressOf(history)).toBeCloseTo(1 / 12);
  });

  it("returns empty history without habits", () => {
    expect(buildHistory([], {}, today, 1).start).toBeNull();
  });
});

describe("streaks", () => {
  const today = "2026-10-30";
  const h = make("a", "2026-10-20");
  const l = logs(["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"].map((d) => ["a", d] as [string, string]));

  it("counts perfect days and doesn't break on an unfinished today", () => {
    const s = balanceStreaks(buildHistory([h], l, today, 1));
    expect(s.current).toBe(6);
    expect(s.longest).toBe(6);
    expect(s.longestEnd).toBe("2026-10-29");
  });

  it("counts a habit's run of completions", () => {
    expect(habitStreak(h, l, today, 1)).toBe(6);
  });
});

describe("structure", () => {
  it("maps today's state and yesterday's misses to members", () => {
    const today = "2026-10-28";
    const done = make("d", "2026-10-20");
    const missed = make("m", "2026-10-20");
    const pending = make("p", "2026-10-27");
    const l = logs([
      ["d", today],
      ["p", "2026-10-27"],
    ]);
    const members = structuralMembers([done, missed, pending], l, today, 1);
    expect(members.map((m) => m.state)).toEqual(["completed", "missed", "pending"]);
  });
});

describe("import validation", () => {
  it("round-trips sample data", () => {
    const sample = buildSample("2026-10-30", 60);
    const parsed = parseEnvelope(JSON.parse(JSON.stringify(toEnvelope(sample))));
    expect(parsed.habits).toHaveLength(sample.habits.length);
    expect(parsed.logs).toHaveLength(sample.logs.length);
  });

  it("rejects foreign files and newer versions", () => {
    expect(() => parseEnvelope({ hello: 1 })).toThrow(ValidationError);
    expect(() => parseEnvelope({ app: "equilibrium", schemaVersion: 99, data: {} })).toThrow(/newer version/);
  });

  it("reports the path of a bad field", () => {
    const sample = buildSample("2026-10-30", 10);
    const env = JSON.parse(JSON.stringify(toEnvelope(sample)));
    env.data.habits[1].history[0].weight = 9;
    expect(() => parseEnvelope(env)).toThrow("habits[1].history[0].weight");
  });

  it("drops orphaned and duplicate logs", () => {
    const sample = buildSample("2026-10-30", 10);
    const env = JSON.parse(JSON.stringify(toEnvelope(sample)));
    const first = env.data.logs[0];
    env.data.logs.push({ ...first }, { ...first, habitId: "ghost" });
    expect(parseEnvelope(env).logs).toHaveLength(sample.logs.length);
  });
});
