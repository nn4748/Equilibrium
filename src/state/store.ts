"use client";

import { create } from "zustand";
import { LocalStorageAdapter, StorageFullError, toEnvelope, type StorageAdapter } from "@/data/adapter";
import { buildSample } from "@/data/sample";
import type { Snapshot } from "@/data/schema";
import { ValidationError, parseEnvelope } from "@/data/validate";
import { minutesOfDay, todayKey } from "@/domain/dates";
import { applyEdit, newHabit, type HabitInput } from "@/domain/habits";
import {
  DEFAULT_SETTINGS,
  type DailyReflection,
  type DateKey,
  type FocusSession,
  type Habit,
  type HabitLog,
  type LogIndex,
  type LogStatus,
  type Mood,
  type UserSettings,
} from "@/domain/types";
import { useTheme } from "./theme";

export type DataMode = "live" | "sample";
const MODE_KEY = "eq:mode";

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

interface DataState {
  status: "loading" | "ready" | "error";
  error: string | null;
  /** Last persistence problem (e.g. storage full), surfaced to the user. */
  saveError: string | null;
  mode: DataMode;
  today: DateKey;
  habits: Habit[];
  logs: LogIndex;
  reflections: Record<DateKey, DailyReflection>;
  focusSessions: FocusSession[];
  settings: UserSettings;

  init: () => Promise<void>;
  refreshToday: () => void;

  createHabit: (input: HabitInput) => Habit;
  createHabits: (inputs: HabitInput[]) => void;
  updateHabit: (id: string, input: HabitInput) => void;
  archiveHabit: (id: string) => void;
  restoreHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  reorderHabits: (orderedIds: string[]) => void;
  setLog: (habitId: string, date: DateKey, status: LogStatus | null) => void;
  toggleCompletion: (habitId: string, date?: DateKey) => boolean;

  saveReflection: (date: DateKey, content: string, mood: Mood | null) => void;
  deleteReflection: (date: DateKey) => void;
  addFocusSession: (session: Omit<FocusSession, "id">) => void;

  updateSettings: (patch: Partial<Omit<UserSettings, "preferences" | "focusSettings">> & {
    preferences?: Partial<UserSettings["preferences"]>;
    focusSettings?: Partial<UserSettings["focusSettings"]>;
  }) => void;
  completeOnboarding: () => void;

  exportJSON: () => string;
  importJSON: (text: string) => Promise<{ ok: true; habits: number; logs: number } | { ok: false; error: string }>;
  restoreBackup: () => Promise<boolean>;
  clearAll: () => Promise<void>;
  setMode: (mode: DataMode) => Promise<void>;
}

const adapters: Record<DataMode, StorageAdapter> = {
  live: new LocalStorageAdapter("live"),
  sample: new LocalStorageAdapter("sample"),
};

function indexLogs(logs: HabitLog[]): LogIndex {
  const index: LogIndex = {};
  for (const l of logs) (index[l.date] ??= {})[l.habitId] = l;
  return index;
}

function emptyData() {
  return { habits: [] as Habit[], logs: {} as LogIndex, reflections: {} as Record<DateKey, DailyReflection>, focusSessions: [] as FocusSession[], settings: DEFAULT_SETTINGS };
}

function fromSnapshot(s: Snapshot) {
  return {
    habits: [...s.habits].sort((a, b) => a.order - b.order),
    logs: indexLogs(s.logs),
    reflections: Object.fromEntries(s.reflections.map((r) => [r.date, r])),
    focusSessions: s.focusSessions,
    settings: s.settings,
  };
}

let hydrating = false;
let listening = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeExternal: (() => void) | null = null;

export const useData = create<DataState>((set, get) => {
  const snapshot = (): Snapshot => {
    const s = get();
    return {
      habits: s.habits,
      logs: Object.values(s.logs).flatMap((byHabit) => Object.values(byHabit)),
      reflections: Object.values(s.reflections),
      focusSessions: s.focusSessions,
      settings: { ...s.settings, theme: useTheme.getState().preference },
    };
  };

  const flush = async () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    try {
      await adapters[get().mode].save(snapshot());
      if (get().saveError) set({ saveError: null });
    } catch (error) {
      set({ saveError: error instanceof StorageFullError ? error.message : "Changes couldn't be saved on this device." });
    }
  };

  const schedule = () => {
    if (hydrating) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
  };

  /** Applies a change and queues a save. */
  const commit = (partial: Partial<DataState> | ((s: DataState) => Partial<DataState>)) => {
    set(partial as Partial<DataState>);
    schedule();
  };

  const load = async (mode: DataMode) => {
    hydrating = true;
    try {
      let data = await adapters[mode].load();
      if (!data && mode === "sample") {
        data = buildSample(todayKey());
        await adapters.sample.save(data);
      }
      const today = todayKey(data?.settings.preferences.dayStartsAtHour ?? 0);
      set({ ...(data ? fromSnapshot(data) : emptyData()), mode, today, status: "ready", error: null });
    } catch (error) {
      const message = error instanceof ValidationError ? `Stored data is invalid (${error.message}).` : "Stored data couldn't be read.";
      set({ status: "error", error: message, mode });
    } finally {
      hydrating = false;
    }
    unsubscribeExternal?.();
    unsubscribeExternal = adapters[mode].subscribe(() => void load(get().mode));
  };

  const nowStamp = () => {
    const now = new Date();
    return { iso: now.toISOString(), minutes: minutesOfDay(now) };
  };

  return {
    status: "loading",
    error: null,
    saveError: null,
    mode: "live",
    today: "1970-01-01",
    ...emptyData(),

    init: async () => {
      if (typeof window === "undefined") return;
      let mode: DataMode = "live";
      try {
        mode = localStorage.getItem(MODE_KEY) === "sample" ? "sample" : "live";
      } catch {
        /* storage blocked */
      }
      await load(mode);
      if (listening) return;
      listening = true;
      const flushNow = () => {
        if (saveTimer) void flush();
      };
      window.addEventListener("pagehide", flushNow);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flushNow();
        else get().refreshToday();
      });
    },

    refreshToday: () => {
      const today = todayKey(get().settings.preferences.dayStartsAtHour);
      if (today !== get().today) set({ today });
    },

    createHabit: (input) => {
      const s = get();
      const habit = newHabit(input, uid(), s.habits.length, s.today, new Date());
      commit({ habits: [...s.habits, habit] });
      return habit;
    },

    createHabits: (inputs) => {
      const s = get();
      const now = new Date();
      const created = inputs.map((input, i) => newHabit(input, uid(), s.habits.length + i, s.today, now));
      commit({ habits: [...s.habits, ...created] });
    },

    updateHabit: (id, input) =>
      commit((s) => ({ habits: s.habits.map((h) => (h.id === id ? applyEdit(h, input, s.today) : h)) })),

    archiveHabit: (id) => commit((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, archivedAt: new Date().toISOString() } : h)) })),

    restoreHabit: (id) => commit((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, archivedAt: null } : h)) })),

    deleteHabit: (id) =>
      commit((s) => {
        const logs: LogIndex = {};
        for (const [date, byHabit] of Object.entries(s.logs)) {
          if (!(id in byHabit)) {
            logs[date] = byHabit;
            continue;
          }
          const rest = { ...byHabit };
          delete rest[id];
          if (Object.keys(rest).length) logs[date] = rest;
        }
        return { habits: s.habits.filter((h) => h.id !== id).map((h, i) => ({ ...h, order: i })), logs };
      }),

    reorderHabits: (orderedIds) =>
      commit((s) => {
        const byId = new Map(s.habits.map((h) => [h.id, h]));
        const ordered = orderedIds.map((id) => byId.get(id)).filter((h): h is Habit => !!h);
        const rest = s.habits.filter((h) => !orderedIds.includes(h.id));
        return { habits: [...ordered, ...rest].map((h, i) => ({ ...h, order: i })) };
      }),

    setLog: (habitId, date, status) =>
      commit((s) => {
        const day = { ...(s.logs[date] ?? {}) };
        if (status === null) delete day[habitId];
        else {
          const { iso, minutes } = nowStamp();
          day[habitId] = { id: `${habitId}:${date}`, habitId, date, status, completedAt: iso, completionTime: minutes };
        }
        const logs = { ...s.logs };
        if (Object.keys(day).length) logs[date] = day;
        else delete logs[date];
        return { logs };
      }),

    toggleCompletion: (habitId, date) => {
      const d = date ?? get().today;
      const done = get().logs[d]?.[habitId]?.status === "completed";
      get().setLog(habitId, d, done ? null : "completed");
      return !done;
    },

    saveReflection: (date, content, mood) =>
      commit((s) => {
        const existing = s.reflections[date];
        const reflections = { ...s.reflections };
        if (!content.trim() && mood === null) {
          delete reflections[date];
          return { reflections };
        }
        const now = new Date().toISOString();
        reflections[date] = { id: existing?.id ?? uid(), date, content, mood, createdAt: existing?.createdAt ?? now, updatedAt: now };
        return { reflections };
      }),

    deleteReflection: (date) =>
      commit((s) => {
        const reflections = { ...s.reflections };
        delete reflections[date];
        return { reflections };
      }),

    addFocusSession: (session) => commit((s) => ({ focusSessions: [...s.focusSessions, { ...session, id: uid() }] })),

    updateSettings: (patch) => {
      commit((s) => ({
        settings: {
          ...s.settings,
          ...patch,
          preferences: { ...s.settings.preferences, ...patch.preferences },
          focusSettings: { ...s.settings.focusSettings, ...patch.focusSettings },
        },
      }));
      if (patch.preferences?.dayStartsAtHour !== undefined) get().refreshToday();
    },

    completeOnboarding: () => commit((s) => ({ settings: { ...s.settings, onboardingCompleted: true } })),

    exportJSON: () => JSON.stringify(toEnvelope(snapshot()), null, 2),

    importJSON: async (text) => {
      let parsed: Snapshot;
      try {
        parsed = parseEnvelope(JSON.parse(text));
      } catch (error) {
        if (error instanceof SyntaxError) return { ok: false, error: "The file isn't valid JSON." };
        if (error instanceof ValidationError) return { ok: false, error: error.message };
        return { ok: false, error: "The file couldn't be read." };
      }
      const adapter = adapters[get().mode];
      try {
        await adapter.backup(snapshot());
        await adapter.save(parsed);
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "Import failed." };
      }
      set({ ...fromSnapshot(parsed), today: todayKey(parsed.settings.preferences.dayStartsAtHour) });
      useTheme.getState().setPreference(parsed.settings.theme);
      return { ok: true, habits: parsed.habits.length, logs: parsed.logs.length };
    },

    restoreBackup: async () => {
      const adapter = adapters[get().mode];
      const backup = await adapter.loadBackup();
      if (!backup) return false;
      await adapter.save(backup);
      set({ ...fromSnapshot(backup) });
      return true;
    },

    clearAll: async () => {
      const adapter = adapters[get().mode];
      // Only back up data that loaded; never overwrite a good backup with nothing.
      if (get().status === "ready") await adapter.backup(snapshot());
      await adapter.clear();
      set({ ...emptyData(), today: todayKey() });
    },

    setMode: async (mode) => {
      await flush();
      try {
        localStorage.setItem(MODE_KEY, mode);
      } catch {
        /* storage blocked */
      }
      set({ status: "loading" });
      await load(mode);
    },
  };
});

/** Active (non-archived) habits in display order. */
export function selectActive(s: Pick<DataState, "habits">): Habit[] {
  return s.habits.filter((h) => !h.archivedAt);
}
