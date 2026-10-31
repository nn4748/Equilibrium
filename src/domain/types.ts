/** Local calendar date, "YYYY-MM-DD". */
export type DateKey = string;
/** 0 = Sunday … 6 = Saturday (matches Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Weight = 1 | 2 | 3 | 4 | 5;
export type ScheduleType = "daily" | "weekdays" | "weekly";
export type TimeOfDay = "anytime" | "morning" | "afternoon" | "evening";
export type ThemePreference = "dark" | "light" | "system";

export interface ScheduleVersion {
  effectiveFrom: DateKey;
  weight: Weight;
  scheduleType: ScheduleType;
  scheduledDays: Weekday[];
  weeklyTarget: number | null;
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  category: string;
  weight: Weight;
  scheduleType: ScheduleType;
  scheduledDays: Weekday[];
  weeklyTarget: number | null;
  preferredTime: TimeOfDay;
  order: number;
  createdAt: string;
  archivedAt: string | null;
  /** Schedule as it applied over time, oldest first. Past days are scored against these. */
  history: ScheduleVersion[];
}

export type LogStatus = "completed" | "skipped";

export interface HabitLog {
  /** `${habitId}:${date}` — one log per habit per day. */
  id: string;
  habitId: string;
  date: DateKey;
  status: LogStatus;
  completedAt: string;
  /** Minutes after local midnight when the log was recorded. */
  completionTime: number;
}

export type Mood = 1 | 2 | 3 | 4 | 5;

export interface DailyReflection {
  id: string;
  date: DateKey;
  content: string;
  mood: Mood | null;
  createdAt: string;
  updatedAt: string;
}

export type FocusSessionType = "work" | "short" | "long";

export interface FocusSession {
  id: string;
  date: DateKey;
  /** Planned length in seconds. */
  duration: number;
  /** Seconds actually focused. */
  completedDuration: number;
  sessionType: FocusSessionType;
  completedAt: string;
}

export interface FocusSettings {
  work: number;
  short: number;
  long: number;
  longEvery: number;
  autoStart: boolean;
}

export interface Preferences {
  weekStartsOn: 0 | 1;
  /** Hour (0–6) at which a new day begins, for late nights. */
  dayStartsAtHour: number;
  reducedMotion: "system" | "on" | "off";
  quality: "auto" | "high" | "low";
}

export interface UserSettings {
  theme: ThemePreference;
  onboardingCompleted: boolean;
  preferences: Preferences;
  focusSettings: FocusSettings;
}

export interface DailyMetrics {
  date: DateKey;
  /** null when nothing was scheduled. */
  balanceScore: number | null;
  completedWeight: number;
  totalWeight: number;
  completedCount: number;
  scheduledCount: number;
}

/** Logs indexed by date, then habit id. */
export type LogIndex = Record<DateKey, Record<string, HabitLog>>;

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  onboardingCompleted: false,
  preferences: { weekStartsOn: 1, dayStartsAtHour: 0, reducedMotion: "system", quality: "auto" },
  focusSettings: { work: 25, short: 5, long: 15, longEvery: 4, autoStart: false },
};
