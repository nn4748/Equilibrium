"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";
import { useState } from "react";
import { CATEGORIES, SUGGESTIONS, type HabitInput } from "@/domain/habits";
import type { StructuralMember } from "@/domain/structure";
import type { ScheduleType, Weight } from "@/domain/types";
import { cn } from "@/lib/cn";
import { useDataBoot } from "@/features/shell/app-shell";
import { Wordmark } from "@/features/shell/parts";
import { WeightMarks } from "@/features/today/habit-row";
import { useData } from "@/state/store";
import { StructureDiagram } from "@/three/structure-diagram";
import { Button } from "@/ui/button";
import { Segmented, WeightStepper } from "@/ui/controls";
import { Input } from "@/ui/field";
import { Label } from "@/ui/typography";

type Draft = HabitInput & { key: string };

const toDraft = (s: (typeof SUGGESTIONS)[number]): Draft => ({
  key: s.title,
  title: s.title,
  description: "",
  category: s.category,
  weight: s.weight,
  scheduleType: s.scheduleType,
  scheduledDays: [1, 2, 3, 4, 5],
  weeklyTarget: s.scheduleType === "weekly" ? 2 : 3,
  preferredTime: s.preferredTime,
});

const DEMO: StructuralMember[] = [5, 3, 4, 2, 4, 3, 2].map((weight, i) => ({ id: String(i), label: "", weight, state: i < 4 ? "completed" : i === 4 ? "missed" : "pending" }));

const SCHEDULES = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
] as const satisfies readonly { value: ScheduleType; label: string }[];

export function OnboardingView() {
  useDataBoot();
  const router = useRouter();
  const reduce = useReducedMotion();
  const status = useData((s) => s.status);
  const createHabits = useData((s) => s.createHabits);
  const completeOnboarding = useData((s) => s.completeOnboarding);
  const setMode = useData((s) => s.setMode);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [custom, setCustom] = useState("");
  const [leaving, setLeaving] = useState(false);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };

  const finish = async (create: boolean) => {
    if (status !== "ready") return;
    if (create && drafts.length) createHabits(
        drafts.map((d) => ({
          title: d.title,
          description: d.description,
          category: d.category,
          weight: d.weight,
          scheduleType: d.scheduleType,
          scheduledDays: d.scheduleType === "weekdays" ? [1, 2, 3, 4, 5] : [],
          weeklyTarget: d.weeklyTarget,
          preferredTime: d.preferredTime,
        })),
      );
    completeOnboarding();
    setLeaving(true);
    window.setTimeout(() => router.replace("/today"), reduce ? 0 : 450);
  };

  const toggle = (d: Draft) => setDrafts((list) => (list.some((x) => x.key === d.key) ? list.filter((x) => x.key !== d.key) : [...list, d]));
  const update = (key: string, patch: Partial<Draft>) => setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const addCustom = () => {
    const title = custom.trim();
    if (!title || drafts.some((d) => d.title.toLowerCase() === title.toLowerCase())) return;
    setDrafts((list) => [
      ...list,
      { key: `custom-${title}`, title: title.slice(0, 60), description: "", category: CATEGORIES[0], weight: 3, scheduleType: "daily", scheduledDays: [1, 2, 3, 4, 5], weeklyTarget: 3, preferredTime: "anytime" },
    ]);
    setCustom("");
  };

  const variants = {
    enter: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * 32 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => (reduce ? { opacity: 0 } : { opacity: 0, x: d * -32 }),
  };

  return (
    <motion.main
      className="flex min-h-dvh flex-col bg-bg"
      animate={leaving ? { opacity: 0, scale: reduce ? 1 : 0.985 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <header className="flex h-16 items-center justify-between gap-4 border-b border-line px-4 md:px-12">
        <Wordmark />
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-3 sm:flex" aria-label={`Step ${step + 1} of 3`}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn("h-px w-8 transition-colors duration-500", i <= step ? "bg-fg" : "bg-line")} />
            ))}
            <span className="text-[13px] text-muted-strong">Step {step + 1} of 3</span>
          </div>
          <button type="button" onClick={() => void finish(false)} className="label-tech h-10 text-muted-strong underline-offset-4 hover:text-fg hover:underline">
            Skip
          </button>
        </div>
      </header>

      <div className="relative flex flex-1 flex-col">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.section
            key={step}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 md:px-12 md:py-16"
          >
            {step === 0 ? (
              <div className="grid flex-1 items-center gap-12 lg:grid-cols-2">
                <div className="flex flex-col gap-8">
                  <Label>Step 1 of 3</Label>
                  <h1 className="text-display font-semibold text-fg-strong">Welcome to Equilibrium</h1>
                  <p className="max-w-md text-[17px] leading-relaxed text-muted-strong">
                    A simple way to build good habits. Each habit is a beam in your bridge. Do your habits and the bridge stays strong and level.
                  </p>
                  <dl className="grid grid-cols-3 gap-px border border-line bg-line">
                    {[
                      ["1", "Pick a few habits"],
                      ["2", "Check them off each day"],
                      ["3", "Watch your progress"],
                    ].map(([t, d]) => (
                      <div key={t} className="flex flex-col gap-1.5 bg-bg p-4">
                        <dt className="text-[22px] font-semibold text-fg-strong tabular-nums">{t}</dt>
                        <dd className="text-[14px] text-fg">{d}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <StructureDiagram members={DEMO} className="max-h-72" />
              </div>
            ) : null}

            {step === 1 ? (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-4">
                  <Label>Step 2 of 3</Label>
                  <h1 className="text-title font-semibold text-fg-strong">Pick your habits</h1>
                  <p className="max-w-lg text-muted-strong">Choose 2 to 5 to start. You can change them later.</p>
                </div>
                <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => {
                    const on = drafts.some((d) => d.key === s.title);
                    return (
                      <li key={s.title} className="bg-bg">
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggle(toDraft(s))}
                          className={cn("flex h-full w-full items-center gap-4 p-4 text-left transition-colors", on ? "bg-surface-2" : "hover:bg-surface")}
                        >
                          <span className={cn("flex size-6 shrink-0 items-center justify-center border transition-colors", on ? "border-fg bg-fg text-bg" : "border-muted")}>
                            {on ? <Check className="size-3.5" strokeWidth={2.25} /> : null}
                          </span>
                          <span className="flex flex-1 flex-col gap-0.5">
                            <span className="text-[15px] text-fg-strong">{s.title}</span>
                            <span className="text-[12px] text-muted-strong">{s.note}</span>
                          </span>
                          <WeightMarks weight={s.weight} className="text-muted-strong" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addCustom();
                  }}
                >
                  <Input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={60} placeholder="Or type your own" aria-label="Custom habit name" />
                  <Button type="submit" variant="secondary" disabled={!custom.trim()}>
                    <Plus className="size-4" strokeWidth={1.5} /> Add
                  </Button>
                </form>
                {drafts.filter((d) => d.key.startsWith("custom-")).length ? (
                  <ul className="flex flex-wrap gap-2">
                    {drafts
                      .filter((d) => d.key.startsWith("custom-"))
                      .map((d) => (
                        <li key={d.key}>
                          <button type="button" onClick={() => toggle(d)} className="h-9 border border-fg px-3 text-[13px] text-fg" aria-label={`Remove ${d.title}`}>
                            {d.title} ×
                          </button>
                        </li>
                      ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex flex-col gap-10">
                <div className="flex flex-col gap-4">
                  <Label>Step 3 of 3</Label>
                  <h1 className="text-title font-semibold text-fg-strong">How important is each one?</h1>
                  <p className="max-w-lg text-muted-strong">More important habits count more toward your daily score. You can also choose how often.</p>
                </div>
                {drafts.length === 0 ? (
                  <p className="text-muted-strong">No habits picked. Go back, or finish and add them later.</p>
                ) : (
                  <ul className="border-t border-line">
                    {drafts.map((d) => (
                      <li key={d.key} className="grid gap-5 border-b border-line py-5 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:gap-8">
                        <span className="text-[16px] text-fg-strong">{d.title}</span>
                        <WeightStepper value={d.weight} onChange={(w: Weight) => update(d.key, { weight: w })} label={`Weight for ${d.title}`} />
                        <Segmented label={`Schedule for ${d.title}`} options={SCHEDULES} value={d.scheduleType} onChange={(scheduleType) => update(d.key, { scheduleType })} size="sm" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </motion.section>
        </AnimatePresence>
      </div>

      <footer className="safe-bottom sticky bottom-0 border-t border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 md:px-12">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => go(step - 1)}>
              <ArrowLeft className="size-4" strokeWidth={1.5} /> Back
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={async () => {
                completeOnboarding();
                await setMode("sample");
                router.replace("/today");
              }}
            >
              Try with sample data
            </Button>
          )}
          {step < 2 ? (
            <Button onClick={() => go(step + 1)} disabled={step === 1 && drafts.length === 0}>
              {step === 0 ? "Get started" : `Next${drafts.length ? ` (${drafts.length})` : ""}`} <ArrowRight className="size-4" strokeWidth={1.5} />
            </Button>
          ) : (
            <Button onClick={() => void finish(true)} disabled={status !== "ready"}>
              Start <ArrowRight className="size-4" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      </footer>
    </motion.main>
  );
}
