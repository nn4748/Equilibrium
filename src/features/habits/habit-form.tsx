"use client";

import { CATEGORIES, type HabitInput } from "@/domain/habits";
import type { ScheduleType, TimeOfDay } from "@/domain/types";
import { cn } from "@/lib/cn";
import { Segmented, WeekdayPicker, WeightStepper } from "@/ui/controls";
import { Field, Input, Textarea } from "@/ui/field";
import { Label } from "@/ui/typography";

export type FormErrors = Partial<Record<keyof HabitInput, string>>;

const SCHEDULES = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Set days" },
  { value: "weekly", label: "Per week" },
] as const satisfies readonly { value: ScheduleType; label: string }[];

const TIMES = [
  { value: "anytime", label: "Any" },
  { value: "morning", label: "AM" },
  { value: "afternoon", label: "Midday" },
  { value: "evening", label: "PM" },
] as const satisfies readonly { value: TimeOfDay; label: string }[];

export function HabitForm({
  value,
  onChange,
  errors,
  weekStartsOn,
  autoFocus = true,
}: {
  value: HabitInput;
  onChange: (next: HabitInput) => void;
  errors: FormErrors;
  weekStartsOn: 0 | 1;
  autoFocus?: boolean;
}) {
  const set = <K extends keyof HabitInput>(key: K, v: HabitInput[K]) => onChange({ ...value, [key]: v });
  const customCategory = !(CATEGORIES as readonly string[]).includes(value.category);

  return (
    <div className="flex flex-col gap-8">
      <Field label="Name" error={errors.title} meta={`${value.title.length}/60`}>
        {(p) => (
          <Input
            {...p}
            data-autofocus={autoFocus || undefined}
            maxLength={60}
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Read 20 pages"
            autoComplete="off"
          />
        )}
      </Field>

      <div className="flex flex-col gap-3">
        <Label>Load weight</Label>
        <WeightStepper value={value.weight} onChange={(w) => set("weight", w)} />
        <p className="text-[13px] text-muted-strong">Heavier habits count for more of your daily balance.</p>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Schedule</Label>
        <Segmented label="Schedule" options={SCHEDULES} value={value.scheduleType} onChange={(v) => set("scheduleType", v)} className="w-full" />
        {value.scheduleType === "weekdays" ? (
          <>
            <WeekdayPicker value={value.scheduledDays} onChange={(d) => set("scheduledDays", d)} weekStartsOn={weekStartsOn} />
            {errors.scheduledDays ? <p role="alert" className="font-mono text-[12px] text-fg">! {errors.scheduledDays}</p> : null}
          </>
        ) : null}
        {value.scheduleType === "weekly" ? (
          <div className="flex items-center justify-between border border-line px-4 py-3">
            <span className="text-[14px] text-fg">Times per week</span>
            <div role="radiogroup" aria-label="Times per week" className="flex">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={value.weeklyTarget === n}
                  onClick={() => set("weeklyTarget", n)}
                  className={cn(
                    "size-9 font-mono text-[13px] transition-colors",
                    value.weeklyTarget === n ? "bg-fg text-bg" : "text-muted-strong hover:text-fg",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {value.scheduleType === "weekly" ? (
          <p className="text-[13px] text-muted-strong">Done any day of the week. It only counts against you once the week is running out.</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <Label>Preferred time</Label>
        <Segmented label="Preferred time" options={TIMES} value={value.preferredTime} onChange={(v) => set("preferredTime", v)} className="w-full" />
      </div>

      <div className="flex flex-col gap-3">
        <Label>Category</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={value.category === c}
              onClick={() => set("category", c)}
              className={cn(
                "h-9 border px-3 text-[13px] transition-colors",
                value.category === c ? "border-fg bg-fg text-bg" : "border-line text-muted-strong hover:border-muted hover:text-fg",
              )}
            >
              {c}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={customCategory}
            onClick={() => !customCategory && set("category", "")}
            className={cn(
              "h-9 border px-3 text-[13px] transition-colors",
              customCategory ? "border-fg text-fg" : "border-dashed border-line text-muted-strong hover:text-fg",
            )}
          >
            Other
          </button>
        </div>
        {customCategory ? (
          <Field label="Category name" error={errors.category}>
            {(p) => <Input {...p} maxLength={24} value={value.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Finance" />}
          </Field>
        ) : null}
      </div>

      <Field label="Notes" meta="Optional">
        {(p) => <Textarea {...p} rows={3} maxLength={280} value={value.description} onChange={(e) => set("description", e.target.value)} />}
      </Field>
    </div>
  );
}
