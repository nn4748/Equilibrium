"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, type HabitInput } from "@/domain/habits";
import type { ScheduleType, TimeOfDay } from "@/domain/types";
import { cn } from "@/lib/cn";
import { Segmented, WeekdayPicker, WeightStepper } from "@/ui/controls";
import { Field, Input, Textarea } from "@/ui/field";
import { t } from "@/i18n";

export type FormErrors = Partial<Record<keyof HabitInput, string>>;

const SCHEDULES = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Some days" },
  { value: "weekly", label: "Per week" },
] as const satisfies readonly { value: ScheduleType; label: string }[];

const TIMES = [
  { value: "anytime", label: "Any time" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
] as const satisfies readonly { value: TimeOfDay; label: string }[];

function Question({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] font-semibold text-fg-strong">{children}</p>;
}

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
  const [more, setMore] = useState(Boolean(value.description) || value.preferredTime !== "anytime" || customCategory || Boolean(errors.category));

  return (
    <div className="flex flex-col gap-8">
      <Field label={t("Name")} error={errors.title && t(errors.title)}>
        {(p) => (
          <Input
            {...p}
            data-autofocus={autoFocus || undefined}
            maxLength={60}
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={t("e.g. Read 20 pages")}
            autoComplete="off"
          />
        )}
      </Field>

      <div className="flex flex-col gap-3">
        <Question>{t("How often?")}</Question>
        <Segmented label={t("How often")} options={SCHEDULES} value={value.scheduleType} onChange={(v) => set("scheduleType", v)} className="w-full" />
        {value.scheduleType === "weekdays" ? (
          <>
            <p className="text-[14px] text-muted-strong">{t("Pick the days:")}</p>
            <WeekdayPicker value={value.scheduledDays} onChange={(d) => set("scheduledDays", d)} weekStartsOn={weekStartsOn} />
            {errors.scheduledDays ? <p role="alert" className="text-[13px] font-medium text-fg">{t(errors.scheduledDays)}</p> : null}
          </>
        ) : null}
        {value.scheduleType === "weekly" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-line px-4 py-3">
            <span className="text-[15px] text-fg">{t("Times a week")}</span>
            <div role="radiogroup" aria-label={t("Times a week")} className="flex">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={value.weeklyTarget === n}
                  onClick={() => set("weeklyTarget", n)}
                  className={cn("size-10 text-[15px] tabular-nums transition-colors", value.weeklyTarget === n ? "bg-fg text-bg" : "text-muted-strong hover:text-fg")}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <Question>{t("How important is it?")}</Question>
        <WeightStepper value={value.weight} onChange={(w) => set("weight", w)} />
        <p className="text-[13px] text-muted-strong">{t("More important habits count more toward your daily score.")}</p>
      </div>

      <div className="border-t border-line pt-5">
        <button
          type="button"
          aria-expanded={more}
          onClick={() => setMore(!more)}
          className="flex w-full items-center justify-between text-[15px] font-medium text-fg"
        >
          {t("More options")}
          <ChevronDown className={cn("size-4 text-muted-strong transition-transform", more && "rotate-180")} strokeWidth={1.75} />
        </button>
        {more ? (
          <div className="mt-6 flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <Question>{t("Best time of day")}</Question>
              <Segmented label={t("Best time of day")} options={TIMES} value={value.preferredTime} onChange={(v) => set("preferredTime", v)} className="w-full" size="sm" />
            </div>

            <div className="flex flex-col gap-3">
              <Question>{t("Category")}</Question>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={value.category === c}
                    onClick={() => set("category", c)}
                    className={cn(
                      "h-10 border px-4 text-[14px] transition-colors",
                      value.category === c ? "border-fg bg-fg text-bg" : "border-line text-muted-strong hover:border-muted hover:text-fg",
                    )}
                  >
                    {t(c)}
                  </button>
                ))}
                <button
                  type="button"
                  aria-pressed={customCategory}
                  onClick={() => !customCategory && set("category", "")}
                  className={cn("h-10 border px-4 text-[14px] transition-colors", customCategory ? "border-fg text-fg" : "border-dashed border-line text-muted-strong hover:text-fg")}
                >
                  {t("Other")}
                </button>
              </div>
              {customCategory ? (
                <Field label={t("Category name")} error={errors.category && t(errors.category)}>
                  {(p) => <Input {...p} maxLength={24} value={value.category} onChange={(e) => set("category", e.target.value)} placeholder={t("e.g. Money")} />}
                </Field>
              ) : null}
            </div>

            <Field label={t("Notes (optional)")}>
              {(p) => <Textarea {...p} rows={3} maxLength={280} value={value.description} onChange={(e) => set("description", e.target.value)} />}
            </Field>
          </div>
        ) : null}
      </div>
    </div>
  );
}
