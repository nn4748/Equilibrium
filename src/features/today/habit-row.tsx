"use client";

import { motion } from "motion/react";
import { Check, SkipForward, Undo2 } from "lucide-react";
import type { DayEntry } from "@/domain/schedule";
import { describeSchedule } from "@/domain/schedule";
import { cn } from "@/lib/cn";
import { IconButton } from "@/ui/button";

const TIME_LABEL = { anytime: "Any time", morning: "Morning", afternoon: "Afternoon", evening: "Evening" } as const;

export function WeightMarks({ weight, className }: { weight: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-end gap-[2px]", className)} aria-label={`Weight ${weight} of 5`}>
      {[1, 2, 3, 4, 5].map((w) => (
        <span key={w} className={cn("w-[3px]", w <= weight ? "bg-current" : "bg-line")} style={{ height: 4 + w * 2 }} />
      ))}
    </span>
  );
}

/**
 * One habit on Today. The whole row is the completion toggle (one tap);
 * skip/unskip sits apart so it can't be hit by accident.
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
        aria-label={`${habit.title}${done ? ", completed" : ""}`}
        whileTap={{ scale: 0.985 }}
        className={cn(
          "flex min-h-[4.5rem] flex-1 items-center gap-4 py-3 pl-1 pr-2 text-left transition-colors md:gap-5",
          "hover:bg-surface/60 disabled:cursor-default disabled:hover:bg-transparent",
        )}
      >
        <span className="w-6 shrink-0 font-mono text-[11px] text-muted-strong">{String(index + 1).padStart(2, "0")}</span>
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
          <span className={cn("truncate text-[16px] tracking-[-0.01em] transition-colors", done || skipped ? "text-muted-strong" : "text-fg-strong")}>{habit.title}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-strong">
            <span>{habit.category}</span>
            <span aria-hidden className="text-line">/</span>
            <span>{habit.scheduleType === "weekly" ? describeSchedule(habit) : TIME_LABEL[habit.preferredTime]}</span>
            {skipped ? <span className="label-tech text-fg">Skipped</span> : null}
            {habit.scheduleType === "weekly" && entry.counted && !done ? <span className="label-tech text-fg">Due</span> : null}
          </span>
        </span>
        <WeightMarks weight={entry.weight} className={cn("shrink-0", done ? "text-fg" : "text-muted-strong")} />
      </motion.button>
      <div className="flex items-center pl-1">
        <IconButton label={skipped ? `Unskip ${habit.title}` : `Skip ${habit.title} today`} size="md" onClick={onSkip} disabled={done} className="md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100">
          {skipped ? <Undo2 className="size-4" strokeWidth={1.5} /> : <SkipForward className="size-4" strokeWidth={1.5} />}
        </IconButton>
      </div>
    </li>
  );
}
