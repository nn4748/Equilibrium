"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------ radio grid */

/** Roving-focus keyboard handling shared by single-choice groups. */
function useRovingKeys<T>(options: readonly T[], value: T, onChange: (v: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = options.indexOf(value);
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % options.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else return;
    event.preventDefault();
    onChange(options[next]!);
    refs.current[next]?.focus();
  };
  return { refs, onKeyDown };
}

/* ------------------------------------------------------------- segmented */

interface SegmentedProps<T extends string> {
  label: string;
  options: readonly { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

export function Segmented<T extends string>({ label, options, value, onChange, size = "md", className }: SegmentedProps<T>) {
  const values = options.map((o) => o.value);
  const { refs, onKeyDown } = useRovingKeys(values, value, onChange);
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={cn("inline-flex border border-line p-0.5", className)}>
      {options.map((option, i) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "label-tech inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap transition-colors duration-200 ease-precise",
              size === "sm" ? "h-7 px-2.5" : "h-9 px-3.5",
              selected ? "bg-fg text-bg" : "text-muted-strong hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- switch */

export function Switch({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn("group relative inline-flex h-6 w-11 shrink-0 items-center border border-line transition-colors duration-200", checked && "border-fg", className)}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 size-4 -translate-y-1/2 transition-[left,background-color] duration-300 ease-settle",
          checked ? "left-[calc(100%-1.25rem)] bg-fg" : "left-[3px] bg-muted",
        )}
      />
    </button>
  );
}

/* ---------------------------------------------------------- load stepper */

const WEIGHTS = [1, 2, 3, 4, 5] as const;
export type WeightValue = (typeof WEIGHTS)[number];

export const weightNames: Record<WeightValue, string> = {
  1: "A little",
  2: "Somewhat",
  3: "Important",
  4: "Very important",
  5: "Top priority",
};

/** Importance 1–5 as five bars of increasing height. Single-choice radiogroup. */
export function WeightStepper({
  value,
  onChange,
  label = "Importance",
  className,
}: {
  value: WeightValue;
  onChange: (v: WeightValue) => void;
  label?: string;
  className?: string;
}) {
  const { refs, onKeyDown } = useRovingKeys(WEIGHTS, value, onChange);
  return (
    <div className={cn("flex items-end gap-4", className)}>
      <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="flex h-12 items-end gap-1.5">
        {WEIGHTS.map((w, i) => {
          const active = w <= value;
          const selected = w === value;
          return (
            <button
              key={w}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${w} — ${weightNames[w]}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(w)}
              className="group flex h-full w-7 items-end justify-center"
            >
              <span
                aria-hidden
                style={{ height: `${28 + w * 14}%` }}
                className={cn(
                  "block w-full transition-[background-color,border-color] duration-200 ease-precise",
                  active ? "bg-fg" : "border border-line bg-transparent group-hover:border-muted",
                )}
              />
            </button>
          );
        })}
      </div>
      <span className="pb-0.5 text-[15px] font-medium text-fg">{weightNames[value]}</span>
    </div>
  );
}

/* -------------------------------------------------------- weekday picker */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** Multi-select weekdays. `weekStartsOn` controls display order only. */
export function WeekdayPicker({
  value,
  onChange,
  weekStartsOn = 1,
  className,
}: {
  value: readonly Weekday[];
  onChange: (days: Weekday[]) => void;
  weekStartsOn?: 0 | 1;
  className?: string;
}) {
  const order = Array.from({ length: 7 }, (_, i) => ((i + weekStartsOn) % 7) as Weekday);
  const toggle = (day: Weekday) => {
    const next = value.includes(day) ? value.filter((d) => d !== day) : [...value, day];
    onChange(next.sort((a, b) => a - b));
  };
  return (
    <div role="group" aria-label="Scheduled days" className={cn("grid grid-cols-7 border-l border-t border-line", className)}>
      {order.map((day) => {
        const on = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={on}
            aria-label={WEEKDAY_NAMES[day]}
            onClick={() => toggle(day)}
            className={cn(
              "flex h-11 flex-col items-center justify-center border-b border-r border-line tabular-nums text-[12px] transition-colors duration-200 ease-precise",
              on ? "bg-fg text-bg" : "text-muted-strong hover:bg-surface hover:text-fg",
            )}
          >
            {WEEKDAY_NAMES[day].slice(0, 2).toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
