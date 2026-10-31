"use client";

import { useMemo } from "react";
import { habitPerformance } from "@/domain/analytics";
import { habitStreak } from "@/domain/streaks";
import { useActiveHabits } from "@/state/derived";
import { useData } from "@/state/store";
import { Label } from "@/ui/typography";
import { t } from "@/i18n";

/** Per-habit 30-day completion rate and current run. */
export function HabitRuns() {
  const habits = useActiveHabits();
  const logs = useData((s) => s.logs);
  const today = useData((s) => s.today);
  const weekStartsOn = useData((s) => s.settings.preferences.weekStartsOn);

  const rows = useMemo(() => {
    const perf = new Map(habitPerformance(habits, logs, today, weekStartsOn, 30, 1).map((p) => [p.habit.id, p]));
    return habits.map((h) => ({ habit: h, perf: perf.get(h.id), run: habitStreak(h, logs, today, weekStartsOn) }));
  }, [habits, logs, today, weekStartsOn]);

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(80px,180px)_48px_48px] gap-4 border-b border-line pb-3">
        <Label>{t("Habit")}</Label>
        <Label>{t("Last 30 days")}</Label>
        <Label className="text-right">{t("Done")}</Label>
        <Label className="text-right">{t("Streak")}</Label>
      </div>
      <ul>
        {rows.map(({ habit, perf, run }) => (
          <li key={habit.id} className="grid grid-cols-[minmax(0,1fr)_minmax(80px,180px)_48px_48px] items-center gap-4 border-b border-line py-3">
            <span className="truncate text-[14px] text-fg">{habit.title}</span>
            <span className="relative h-2 border border-line" aria-hidden>
              <span className="absolute inset-y-0 left-0 bg-fg" style={{ width: `${(perf?.rate ?? 0) * 100}%` }} />
            </span>
            <span className="text-right tabular-nums text-[13px] font-tabular text-fg">{perf ? `${Math.round(perf.rate * 100)}%` : "—"}</span>
            <span className="text-right tabular-nums text-[13px] font-tabular text-muted-strong">{run}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
