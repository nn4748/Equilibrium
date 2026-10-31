import { isDateKey } from "@/domain/dates";
import {
  DEFAULT_SETTINGS,
  type DailyReflection,
  type FocusSession,
  type Habit,
  type HabitLog,
  type ScheduleVersion,
  type UserSettings,
} from "@/domain/types";
import { SCHEMA_VERSION, migrate, type Snapshot } from "./schema";

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isIso = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v));
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isWeekdays = (v: unknown): v is number[] => Array.isArray(v) && v.every((d) => isInt(d, 0, 6));

export class ValidationError extends Error {}

function fail(path: string, problem: string): never {
  throw new ValidationError(`${path}: ${problem}`);
}

function version(v: unknown, path: string): ScheduleVersion {
  if (!isObj(v)) fail(path, "expected an object");
  if (!isDateKey(v.effectiveFrom)) fail(`${path}.effectiveFrom`, "expected a date");
  if (!isInt(v.weight, 1, 5)) fail(`${path}.weight`, "expected 1–5");
  if (v.scheduleType !== "daily" && v.scheduleType !== "weekdays" && v.scheduleType !== "weekly") fail(`${path}.scheduleType`, "unknown schedule");
  if (!isWeekdays(v.scheduledDays)) fail(`${path}.scheduledDays`, "expected weekdays 0–6");
  if (v.weeklyTarget !== null && !isInt(v.weeklyTarget, 1, 7)) fail(`${path}.weeklyTarget`, "expected 1–7 or null");
  return {
    effectiveFrom: v.effectiveFrom,
    weight: v.weight as ScheduleVersion["weight"],
    scheduleType: v.scheduleType,
    scheduledDays: [...new Set(v.scheduledDays)].sort() as ScheduleVersion["scheduledDays"],
    weeklyTarget: v.weeklyTarget as number | null,
  };
}

function habit(v: unknown, path: string): Habit {
  if (!isObj(v)) fail(path, "expected an object");
  if (!isStr(v.id) || !v.id) fail(`${path}.id`, "missing");
  if (!isStr(v.title) || !v.title.trim()) fail(`${path}.title`, "missing");
  if (!isIso(v.createdAt)) fail(`${path}.createdAt`, "expected a timestamp");
  if (v.archivedAt !== null && !isIso(v.archivedAt)) fail(`${path}.archivedAt`, "expected a timestamp or null");
  if (!Array.isArray(v.history) || v.history.length === 0) fail(`${path}.history`, "expected at least one schedule");
  const history = v.history.map((h, i) => version(h, `${path}.history[${i}]`)).sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  const last = history[history.length - 1]!;
  const time = v.preferredTime;
  return {
    id: v.id,
    title: v.title.trim().slice(0, 60),
    description: isStr(v.description) ? v.description : "",
    category: isStr(v.category) && v.category.trim() ? v.category.trim() : "General",
    preferredTime: time === "morning" || time === "afternoon" || time === "evening" ? time : "anytime",
    order: Number.isFinite(v.order) ? (v.order as number) : 0,
    createdAt: v.createdAt,
    archivedAt: v.archivedAt as string | null,
    weight: last.weight,
    scheduleType: last.scheduleType,
    scheduledDays: last.scheduledDays,
    weeklyTarget: last.weeklyTarget,
    history,
  };
}

function log(v: unknown, path: string): HabitLog {
  if (!isObj(v)) fail(path, "expected an object");
  if (!isStr(v.habitId)) fail(`${path}.habitId`, "missing");
  if (!isDateKey(v.date)) fail(`${path}.date`, "expected a date");
  if (v.status !== "completed" && v.status !== "skipped") fail(`${path}.status`, "unknown status");
  if (!isIso(v.completedAt)) fail(`${path}.completedAt`, "expected a timestamp");
  return {
    id: `${v.habitId}:${v.date}`,
    habitId: v.habitId,
    date: v.date,
    status: v.status,
    completedAt: v.completedAt,
    completionTime: isInt(v.completionTime, 0, 1439) ? v.completionTime : 0,
  };
}

function reflection(v: unknown, path: string): DailyReflection {
  if (!isObj(v)) fail(path, "expected an object");
  if (!isDateKey(v.date)) fail(`${path}.date`, "expected a date");
  if (!isStr(v.content)) fail(`${path}.content`, "expected text");
  if (v.mood !== null && !isInt(v.mood, 1, 5)) fail(`${path}.mood`, "expected 1–5 or null");
  const now = new Date().toISOString();
  return {
    id: isStr(v.id) ? v.id : v.date,
    date: v.date,
    content: v.content,
    mood: v.mood as DailyReflection["mood"],
    createdAt: isIso(v.createdAt) ? v.createdAt : now,
    updatedAt: isIso(v.updatedAt) ? v.updatedAt : now,
  };
}

function session(v: unknown, path: string): FocusSession {
  if (!isObj(v)) fail(path, "expected an object");
  if (!isStr(v.id)) fail(`${path}.id`, "missing");
  if (!isDateKey(v.date)) fail(`${path}.date`, "expected a date");
  if (!isInt(v.duration, 1, 86_400) || !isInt(v.completedDuration, 0, 86_400)) fail(path, "invalid duration");
  if (v.sessionType !== "work" && v.sessionType !== "short" && v.sessionType !== "long") fail(`${path}.sessionType`, "unknown type");
  if (!isIso(v.completedAt)) fail(`${path}.completedAt`, "expected a timestamp");
  return { id: v.id, date: v.date, duration: v.duration, completedDuration: v.completedDuration, sessionType: v.sessionType, completedAt: v.completedAt };
}

function settings(v: unknown): UserSettings {
  const d = DEFAULT_SETTINGS;
  if (!isObj(v)) return d;
  const p = isObj(v.preferences) ? v.preferences : {};
  const f = isObj(v.focusSettings) ? v.focusSettings : {};
  return {
    theme: v.theme === "light" || v.theme === "system" ? v.theme : "dark",
    onboardingCompleted: v.onboardingCompleted === true,
    preferences: {
      weekStartsOn: p.weekStartsOn === 0 ? 0 : 1,
      dayStartsAtHour: isInt(p.dayStartsAtHour, 0, 6) ? p.dayStartsAtHour : 0,
      reducedMotion: p.reducedMotion === "on" || p.reducedMotion === "off" ? p.reducedMotion : "system",
      quality: p.quality === "high" || p.quality === "low" ? p.quality : "auto",
    },
    focusSettings: {
      work: isInt(f.work, 1, 180) ? f.work : d.focusSettings.work,
      short: isInt(f.short, 1, 60) ? f.short : d.focusSettings.short,
      long: isInt(f.long, 1, 90) ? f.long : d.focusSettings.long,
      longEvery: isInt(f.longEvery, 2, 8) ? f.longEvery : d.focusSettings.longEvery,
      autoStart: f.autoStart === true,
    },
  };
}

function list<T>(v: unknown, path: string, parse: (x: unknown, p: string) => T): T[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) fail(path, "expected a list");
  return v.map((x, i) => parse(x, `${path}[${i}]`));
}

/**
 * Validates an envelope (export file or stored data) and returns a clean
 * snapshot. Throws ValidationError with a readable path on the first problem.
 */
export function parseEnvelope(raw: unknown): Snapshot {
  if (!isObj(raw) || raw.app !== "equilibrium") throw new ValidationError("This isn't an Equilibrium export.");
  const ver = raw.schemaVersion;
  if (!isInt(ver, 1, 1000)) throw new ValidationError("Missing schema version.");
  if (ver > SCHEMA_VERSION) throw new ValidationError("This file was made by a newer version of Equilibrium.");
  const data = migrate(raw.data, ver);
  if (!isObj(data)) throw new ValidationError("data: expected an object");

  const habits = list(data.habits, "habits", habit);
  const ids = new Set(habits.map((h) => h.id));
  if (ids.size !== habits.length) throw new ValidationError("habits: duplicate ids");

  // Drop logs for unknown habits and keep one log per habit per day.
  const logs = new Map<string, HabitLog>();
  for (const l of list(data.logs, "logs", log)) if (ids.has(l.habitId)) logs.set(l.id, l);
  const reflections = new Map<string, DailyReflection>();
  for (const r of list(data.reflections, "reflections", reflection)) reflections.set(r.date, r);

  return {
    habits: habits.sort((a, b) => a.order - b.order).map((h, i) => ({ ...h, order: i })),
    logs: [...logs.values()],
    reflections: [...reflections.values()],
    focusSessions: list(data.focusSessions, "focusSessions", session),
    settings: settings(data.settings),
  };
}
