"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useEffect, useMemo } from "react";
import type { DayEntry } from "@/domain/schedule";
import { averageScore } from "@/domain/scoring";
import { useActiveHabits, useDay, useHistory, useStructure } from "@/state/derived";
import { useData } from "@/state/store";
import { useUI } from "@/state/ui-store";
import { StructureView } from "@/three/structure-view";
import { Button } from "@/ui/button";
import { EmptyState } from "@/ui/feedback";
import { Page, PageHeader } from "@/ui/page";
import { toast } from "@/ui/toast";
import { HabitRow } from "./habit-row";
import { formatDate, t } from "@/i18n";

const ORDER = { morning: 0, anytime: 1, afternoon: 2, evening: 3 } as const;

/** "2 of 4 done", a bar, and the week's average — nothing to decode. */
function ProgressCard({ done, total, score, week }: { done: number; total: number; score: number | null; week: number | null }) {
  const all = total > 0 && done === total;
  return (
    <section aria-label={t("Today's progress")} className="border border-line bg-bg-raised p-5 md:p-6">
      <div className="flex items-end justify-between gap-4">
        <p className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-fg-strong tabular-nums">
          {done} <span className="text-[18px] font-medium text-muted-strong">{t("of {total} done", { total })}</span>
        </p>
        <p className="text-[14px] text-muted-strong tabular-nums">{score === null ? "" : `${Math.round(score)}%`}</p>
      </div>
      <div className="mt-4 h-2 bg-surface-2" role="progressbar" aria-label={t("Done today")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(score ?? 0)}>
        <motion.div className="h-full bg-fg" initial={false} animate={{ width: `${score ?? 0}%` }} transition={{ type: "spring", stiffness: 140, damping: 24 }} />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={all ? "all" : "some"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-[14px] text-muted-strong">
          {all ? t("All done for today. Nice work.") : week === null ? t("Tap a habit when you've done it.") : t("Your average this week: {n}%", { n: Math.round(week) })}
        </motion.p>
      </AnimatePresence>
    </section>
  );
}

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

  const toggle = (e: DayEntry) => {
    const completed = toggleCompletion(e.habit.id);
    if (completed) {
      navigator.vibrate?.(8);
      toast(t("Done: {name}", { name: e.habit.title }), { action: { label: t("Undo"), run: () => toggleCompletion(e.habit.id) } });
    }
  };
  const skip = (e: DayEntry) => {
    const skipped = e.status === "skipped";
    setLog(e.habit.id, today, skipped ? null : "skipped");
    if (!skipped) toast(t("Skipped for today: {name}", { name: e.habit.title }), { action: { label: t("Undo"), run: () => setLog(e.habit.id, today, null) } });
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

  const dateLine = formatDate(today, { weekday: "long", day: "numeric", month: "long" });
  const addButton = (
    <Button variant="secondary" onClick={() => openEditor(null)}>
      <Plus className="size-4" strokeWidth={1.75} /> {t("Add habit")}
    </Button>
  );

  if (active.length === 0) {
    return (
      <Page>
        <PageHeader title={t("Today")} subtitle={dateLine} />
        <EmptyState
          title={t("You don't have any habits yet.")}
          action={
            <Button onClick={() => openEditor(null)}>
              <Plus className="size-4" strokeWidth={1.75} /> {t("Add your first habit")}
            </Button>
          }
        >
          {t("Add one or two to start. You can change them any time.")}
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page className="max-w-[880px]">
      <PageHeader title={t("Today")} subtitle={dateLine} actions={<span className="hidden md:block">{addButton}</span>} />

      <ProgressCard done={metrics.completedCount} total={metrics.scheduledCount} score={metrics.balanceScore} week={week} />

      <section aria-labelledby="todo" className="mt-10">
        <h2 id="todo" className="border-b border-line pb-3 text-heading font-semibold text-fg-strong">
          {t("Your habits today")}
        </h2>
        {due.length === 0 ? (
          <p className="py-8 text-muted-strong">{t("Nothing planned for today.")}</p>
        ) : (
          <ul>
            {due.map((e, i) => (
              <HabitRow key={e.habit.id} entry={e} index={i} onToggle={() => toggle(e)} onSkip={() => skip(e)} />
            ))}
          </ul>
        )}
      </section>

      {flexible.length > 0 ? (
        <section aria-labelledby="flexible" className="mt-10">
          <div className="border-b border-line pb-3">
            <h2 id="flexible" className="text-heading font-semibold text-fg-strong">
              {t("This week")}
            </h2>
            <p className="mt-1 text-[14px] text-muted-strong">{t("Do these on any day this week.")}</p>
          </div>
          <ul>
            {flexible.map((e, i) => (
              <HabitRow key={e.habit.id} entry={e} index={due.length + i} onToggle={() => toggle(e)} onSkip={() => skip(e)} />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 md:hidden">{addButton}</div>

      <section aria-labelledby="structure" className="mt-14">
        <div className="mb-4 flex flex-col gap-1">
          <h2 id="structure" className="text-heading font-semibold text-fg-strong">
            {t("Your bridge")}
          </h2>
          <p className="text-[14px] text-muted-strong">
            Each habit is one beam. When you do a habit, its beam turns solid. A habit you missed recently shows as an outline. Do them all and the bridge stands level.
          </p>
        </div>
        <div className="relative border border-line">
          <StructureView
            members={structure.members}
            stress={structure.stress}
            equilibrium={structure.equilibrium}
            label={t("Bridge with {n} beams. {done} of {total} done today.", { n: structure.members.length, done: metrics.completedCount, total: metrics.scheduledCount })}
            className="h-[240px] sm:h-[320px]"
          />
          {structure.equilibrium ? <p className="pointer-events-none absolute bottom-3 left-4 text-[13px] font-medium text-fg-strong">{t("Level and steady")}</p> : null}
        </div>
      </section>
    </Page>
  );
}
