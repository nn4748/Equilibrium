"use client";

import { motion } from "motion/react";
import type { DayEntry } from "@/domain/schedule";
import { cn } from "@/lib/cn";
import { Label } from "@/ui/typography";

/**
 * Today's load as a segmented bar: one segment per counted habit, its width
 * proportional to weight; completed segments are filled.
 */
export function LoadBar({ entries, className }: { entries: readonly DayEntry[]; className?: string }) {
  const counted = entries.filter((e) => e.counted);
  const total = counted.reduce((s, e) => s + e.weight, 0);
  const done = counted.filter((e) => e.status === "completed").reduce((s, e) => s + e.weight, 0);
  const remaining = total - done;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between">
        <Label>Remaining load</Label>
        <span className="font-mono text-data font-tabular text-fg">
          {remaining}
          <span className="text-muted-strong"> / {total}</span>
        </span>
      </div>
      <div className="flex h-3 gap-[3px]" aria-hidden>
        {total === 0 ? <div className="flex-1 bg-hatch" /> : null}
        {counted.map((e) => (
          <div key={e.habit.id} className="relative border border-line" style={{ flexGrow: e.weight, flexBasis: 0 }} title={`${e.habit.title} · W${e.weight}`}>
            <motion.div
              className="absolute inset-0 origin-left bg-fg"
              initial={false}
              animate={{ scaleX: e.status === "completed" ? 1 : 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
