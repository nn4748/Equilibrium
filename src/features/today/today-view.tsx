"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useEffect, useMemo } from "react";
import { formatKey } from "@/domain/dates";
import type { DayEntry } from "@/domain/schedule";
import { averageScore } from "@/domain/scoring";
import { BalanceGauge } from "@/features/metrics/balance-gauge";
import { DayProgress } from "@/features/metrics/day-progress";
import { LoadBar } from "@/features/metrics/load-bar";
import { useActiveHabits, useDay, useHistory, useStructure } from "@/state/derived";
import { useData } from "@/state/store";
import { useUI } from "@/state/ui-store";
import { StructureView } from "@/three/structure-view";
import { Button } from "@/ui/button";
import { EmptyState } from "@/ui/feedback";
import { Page, PageHeader } from "@/ui/page";
import { toast } from "@/ui/toast";
import { Kbd, Label } from "@/ui/typography";
import { HabitRow } from "./habit-row";

const ORDER = { morning: 0, anytime: 1, afternoon: 2, evening: 3 } as const;

export function TodayView() {
  const today = useData((s) => s.today);
  const toggleCompletion = useData((s) => s.toggleCompletion);
  const setLog = useData((s) => s.setLog);
  const openEditor = useUI((s) => s.openEditor);
  const active = useActiveHabits();
  const { entries, metrics } = useDay();
  const history = useHistory();
  const structure = useStructure();

  // Weekly habits stay in their own section so rows never jump when ticked.
  const due = useMemo(
    () => entries.filter((e) => e.habit.scheduleType !== "weekly").sort((a, b) => ORDER[a.habit.preferredTime] - ORDER[b.habit.preferredTime]),
    [entries],
  );
  const flexible = useMemo(() => entries.filter((e) => e.habit.scheduleType === "weekly"), [entries]);
  const ordered = useMemo(() => [...due, ...flexible], [due, flexible]);

  const week = averageScore(history, today, 7);
  const month = averageScore(history, today, 30);

  const toggle = (e: DayEntry) => {
    const completed = toggleCompletion(e.habit.id);
    if (completed) {
      navigator.vibrate?.(8);
      toast(`“${e.habit.title}” completed.`, { action: { label: "Undo", run: () => toggleCompletion(e.habit.id) } });
    }
  };
  const skip = (e: DayEntry) => {
    const skipped = e.status === "skipped";
    setLog(e.habit.id, today, skipped ? null : "skipped");
    if (!skipped) toast(`“${e.habit.title}” skipped for today. It won't count against your balance.`, { action: { label: "Undo", run: () => setLog(e.habit.id, today, null) } });
  };

  // Number keys 1–9 toggle the matching row.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      const n = Number(event.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;
      const e = ordered[n - 1];
      if (e && e.status !== "skipped") toggle(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const weekday = formatKey(today, { weekday: "long" });
  const dateLine = formatKey(today, { day: "numeric", month: "long", year: "numeric" });
  const label = `Structure with ${structure.members.length} members: ${metrics.completedCount} of ${metrics.scheduledCount} due today completed.`;

  if (active.length === 0) {
    return (
      <Page>
        <PageHeader index={2} section="Today" title={weekday} meta={dateLine} />
        <EmptyState
          title="No habits yet."
          action={
            <Button onClick={() => openEditor(null)}>
              <Plus className="size-4" strokeWidth={1.5} /> Add a habit
            </Button>
          }
        >
          Each habit becomes a member of your structure. Start with one or two.
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader index={2} section="Today" title={weekday} meta={dateLine} />

      <div className="grid gap-px border border-line bg-line lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="relative bg-bg">
          <StructureView
            members={structure.members}
            stress={structure.stress}
            equilibrium={structure.equilibrium}
            label={label}
            className="h-[260px] sm:h-[340px] lg:h-full lg:min-h-[440px]"
          />
          <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-between gap-4">
            <Label>Members {String(structure.members.length).padStart(2, "0")}</Label>
            <Label>Stress {Math.round(structure.stress * 100)}%</Label>
          </div>
          <AnimatePresence>
            {structure.equilibrium ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="label-tech pointer-events-none absolute bottom-4 left-4 text-fg-strong"
              >
                Equilibrium — every load carried
              </motion.p>
            ) : null}
          </AnimatePresence>
        </section>

        <aside className="flex flex-col gap-8 bg-bg p-5 md:p-6">
          <BalanceGauge today={metrics.balanceScore} week={week} month={month} />
          <LoadBar entries={entries} />
          <DayProgress />
        </aside>
      </div>

      <section aria-labelledby="due" className="mt-12">
        <div className="flex items-end justify-between border-b border-line pb-3">
          <h2 id="due" className="text-heading font-medium text-fg-strong">
            Due today
            <span className="ml-3 font-mono text-[13px] font-normal text-muted-strong">
              {metrics.completedCount}/{metrics.scheduledCount}
            </span>
          </h2>
          <p className="hidden items-center gap-2 text-[12px] text-muted-strong md:flex">
            <Kbd>1</Kbd>–<Kbd>9</Kbd> to toggle
          </p>
        </div>
        {due.length === 0 ? (
          <p className="py-8 text-muted-strong">Nothing scheduled for today.</p>
        ) : (
          <ul>
            {due.map((e, i) => (
              <HabitRow key={e.habit.id} entry={e} index={i} onToggle={() => toggle(e)} onSkip={() => skip(e)} />
            ))}
          </ul>
        )}
      </section>

      {flexible.length > 0 ? (
        <section aria-labelledby="flexible" className="mt-12">
          <div className="border-b border-line pb-3">
            <h2 id="flexible" className="text-heading font-medium text-fg-strong">
              This week
            </h2>
            <p className="mt-1 text-[13px] text-muted-strong">Do these any day. One becomes due when the week starts running short.</p>
          </div>
          <ul>
            {flexible.map((e, i) => (
              <HabitRow key={e.habit.id} entry={e} index={due.length + i} onToggle={() => toggle(e)} onSkip={() => skip(e)} />
            ))}
          </ul>
        </section>
      ) : null}
    </Page>
  );
}
