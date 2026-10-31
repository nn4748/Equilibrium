"use client";

import { motion } from "motion/react";
import { Check, SkipForward, Undo2 } from "lucide-react";
import type { DayEntry } from "@/domain/schedule";
import { describeSchedule } from "@/i18n";
import { cn } from "@/lib/cn";
import { IconButton } from "@/ui/button";
import { t } from "@/i18n";

const TIME_LABEL = { anytime: "Any time", morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const;

export function WeightMarks({ weight, className }: { weight: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-end gap-[2px]", className)} role="img" aria-label={t("Importance {n} of 5", { n: weight })} title={t("Importance {n} of 5", { n: weight })}>
      {[1, 2, 3, 4, 5].map((w) => (
        <span key={w} className={cn("w-[3px]", w <= weight ? "bg-current" : "bg-line")} style={{ height: 4 + w * 2 }} />
      ))}
    </span>
  );
}

/**
 * One habit on Today. The whole row is the completion toggle (one tap);
 * skip sits apart so it can't be hit by accident. `index` is used for the 1–9 shortcut hint.
 */
export function HabitRow({
  entry,
  index,
  onToggle,
  onSkip,
}: {
  entry: DayEntry;
  index: number;
  onToggle: () => void;
  onSkip: () => void;
}) {
  const { habit, status } = entry;
  const done = status === "completed";
  const skipped = status === "skipped";
  const missed = status === "missed";

  return (
    <li className="group relative flex items-stretch border-b border-line">
      <motion.button
        type="button"
        onClick={onToggle}
        disabled={skipped}
        aria-pressed={done}
        aria-label={done ? t("{name}, done", { name: habit.title }) : habit.title}
        title={t("Shortcut: {n}", { n: index + 1 })}
        whileTap={{ scale: 0.985 }}
        className={cn(
          "flex min-h-[4.5rem] flex-1 items-center gap-4 py-3 pl-1 pr-2 text-left transition-colors md:gap-5",
          "hover:bg-surface/60 disabled:cursor-default disabled:hover:bg-transparent",
        )}
      >
        <span
          className={cn(
            "relative flex size-7 shrink-0 items-center justify-center border transition-colors duration-200",
            done ? "border-fg bg-fg" : missed ? "border-dashed border-muted" : "border-muted group-hover:border-fg",
          )}
          aria-hidden
        >
          <motion.span
            initial={false}
            animate={done ? { scale: [0.4, 1.18, 1], opacity: 1 } : { scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="text-bg"
          >
            <Check className="size-4" strokeWidth={2.25} />
          </motion.span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={cn("truncate text-[17px] font-medium transition-colors", done || skipped ? "text-muted-strong line-through decoration-line" : "text-fg-strong")}>{habit.title}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-strong">
            <span>{t(habit.category)}</span>
            <span aria-hidden>·</span>
            <span>{habit.scheduleType === "weekly" ? describeSchedule(habit) : t(TIME_LABEL[habit.preferredTime])}</span>
            {skipped ? <span className="font-medium text-fg">{t("Skipped today")}</span> : null}
            {missed ? <span className="font-medium text-fg">{t("Missed")}</span> : null}
            {habit.scheduleType === "weekly" && entry.counted && !done ? <span className="font-medium text-fg">{t("Do it today")}</span> : null}
          </span>
        </span>
        <WeightMarks weight={entry.weight} className={cn("shrink-0", done ? "text-fg" : "text-muted-strong")} />
      </motion.button>
      <div className="flex items-center pl-1">
        <IconButton label={skipped ? t("Undo skip: {name}", { name: habit.title }) : t("Skip today: {name}", { name: habit.title })} size="md" onClick={onSkip} disabled={done} className="md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100">
          {skipped ? <Undo2 className="size-4" strokeWidth={1.5} /> : <SkipForward className="flip-rtl size-4" strokeWidth={1.5} />}
        </IconButton>
      </div>
    </li>
  );
}
