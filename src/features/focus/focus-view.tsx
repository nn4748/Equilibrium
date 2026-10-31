"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Pause, Play, RotateCcw, Settings2, SkipForward, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, startOfWeek } from "@/domain/dates";
import type { FocusSessionType } from "@/domain/types";
import { cn } from "@/lib/cn";
import { useDataBoot } from "@/features/shell/app-shell";
import { useStructure } from "@/state/derived";
import { useData } from "@/state/store";
import { StructureView } from "@/three/structure-view";
import { Button, IconButton } from "@/ui/button";
import { Switch } from "@/ui/controls";
import { Sheet } from "@/ui/overlay";
import { toast, Toaster } from "@/ui/toast";
import { Kbd, Label } from "@/ui/typography";
import { formatClock, restoreTimer, timeLeft, useTimer } from "./timer";
import { t } from "@/i18n";

const PHASE_LABEL: Record<FocusSessionType, string> = { work: "Focus", short: "Short break", long: "Long break" };

function minutesFor(phase: FocusSessionType, f: { work: number; short: number; long: number }) {
  return phase === "work" ? f.work : phase === "short" ? f.short : f.long;
}

function Stepper({ label, value, min, max, onChange, unit = "min" }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-4">
      <span className="text-[15px] text-fg">{label}</span>
      <div className="flex items-center gap-1">
        <IconButton label={t("Less: {name}", { name: label })} size="sm" disabled={value <= min} onClick={() => onChange(value - 1)}>
          <span aria-hidden>−</span>
        </IconButton>
        <span className="w-16 text-center tabular-nums text-[14px] font-tabular text-fg-strong">
          {value} <span className="text-muted-strong">{t(unit)}</span>
        </span>
        <IconButton label={t("More: {name}", { name: label })} size="sm" disabled={value >= max} onClick={() => onChange(value + 1)}>
          <span aria-hidden>+</span>
        </IconButton>
      </div>
    </div>
  );
}

export function FocusView() {
  useDataBoot();
  const status = useData((s) => s.status);
  const focus = useData((s) => s.settings.focusSettings);
  const updateSettings = useData((s) => s.updateSettings);
  const addFocusSession = useData((s) => s.addFocusSession);
  const sessions = useData((s) => s.focusSessions);
  const today = useData((s) => s.today);
  const weekStartsOn = useData((s) => s.settings.preferences.weekStartsOn);
  const structure = useStructure();
  const timer = useTimer();
  const [now, setNow] = useState(() => Date.now());
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Restore a timer left running on a previous visit.
  useEffect(() => {
    if (useTimer.getState().hydrated) return;
    const saved = restoreTimer();
    useTimer.setState({ ...(saved ?? {}), hydrated: true });
  }, []);

  // Keep an idle timer in sync with the configured durations.
  useEffect(() => {
    if (timer.status !== "idle" || status !== "ready") return;
    const ms = minutesFor(timer.phase, focus) * 60_000;
    if (ms !== timer.duration) timer.set({ duration: ms, remaining: ms });
  }, [focus, timer, status]);

  const record = useCallback(
    (phase: FocusSessionType, plannedMs: number, doneMs: number) => {
      if (doneMs < 60_000) return;
      addFocusSession({
        date: useData.getState().today,
        duration: Math.round(plannedMs / 1000),
        completedDuration: Math.round(doneMs / 1000),
        sessionType: phase,
        completedAt: new Date().toISOString(),
      });
    },
    [addFocusSession],
  );

  const advance = useCallback(
    (finished: boolean) => {
      const tm = useTimer.getState();
      const f = useData.getState().settings.focusSettings;
      const elapsed = tm.duration - timeLeft(tm, Date.now());
      record(tm.phase, tm.duration, finished ? tm.duration : elapsed);
      let cycle = tm.cycle;
      let next: FocusSessionType;
      if (tm.phase === "work") {
        cycle = finished || elapsed >= 60_000 ? cycle + 1 : cycle;
        next = cycle > 0 && cycle % f.longEvery === 0 ? "long" : "short";
      } else {
        next = "work";
        if (tm.phase === "long") cycle = 0;
      }
      const ms = minutesFor(next, f) * 60_000;
      const run = finished && f.autoStart;
      tm.set({ phase: next, cycle, duration: ms, remaining: ms, status: run ? "running" : "idle", endsAt: run ? Date.now() + ms : null });
      if (finished) {
        toast(tm.phase === "work" ? t("Nice focus. Time for a break.") : t("Break is over. Ready when you are."));
        navigator.vibrate?.([12, 60, 12]);
      }
    },
    [record],
  );

  // Tick while running; finish the phase when time is up.
  useEffect(() => {
    if (timer.status !== "running") return;
    const id = window.setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (timeLeft(useTimer.getState(), n) <= 0) advance(true);
    }, 250);
    return () => window.clearInterval(id);
  }, [timer.status, advance]);

  const left = timeLeft(timer, now);
  const progress = timer.duration ? 1 - left / timer.duration : 0;

  useEffect(() => {
    document.title = timer.status === "idle" ? `${t("Focus")} · Equilibrium` : `${formatClock(left)} · ${t(PHASE_LABEL[timer.phase])}`;
    return () => {
      document.title = "Equilibrium";
    };
  }, [left, timer.status, timer.phase]);

  const start = () => {
    const n = Date.now();
    setNow(n);
    timer.set({ status: "running", endsAt: n + timer.remaining });
  };
  const pause = () => timer.set({ status: "paused", remaining: timeLeft(timer, Date.now()), endsAt: null });
  const reset = () => {
    const tm = useTimer.getState();
    if (tm.status !== "idle") record(tm.phase, tm.duration, tm.duration - timeLeft(tm, Date.now()));
    const ms = minutesFor(tm.phase, focus) * 60_000;
    tm.set({ status: "idle", endsAt: null, remaining: ms, duration: ms });
  };

  // Space: start/pause · R: reset · S: skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, button, [role=dialog]")) return;
      if (e.key === " ") {
        e.preventDefault();
        if (useTimer.getState().status === "running") pause();
        else start();
      } else if (e.key.toLowerCase() === "r") reset();
      else if (e.key.toLowerCase() === "s") advance(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const stats = useMemo(() => {
    const weekStart = startOfWeek(today, weekStartsOn);
    const work = sessions.filter((s) => s.sessionType === "work");
    const todays = work.filter((s) => s.date === today);
    const week = work.filter((s) => s.date >= weekStart && s.date <= addDays(weekStart, 6));
    const mins = (list: typeof work) => Math.round(list.reduce((t, s) => t + s.completedDuration, 0) / 60);
    return { todays: [...todays].reverse(), todayMin: mins(todays), weekMin: mins(week), weekCount: week.length };
  }, [sessions, today, weekStartsOn]);

  const running = timer.status === "running";

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-bg">
      <div aria-hidden className={cn("absolute inset-0 transition-opacity duration-1000", running ? "opacity-40" : "opacity-60")}>
        {status === "ready" ? (
          <StructureView members={structure.members} stress={structure.stress} equilibrium={structure.equilibrium} mode="orbit" label="" className="h-full w-full" />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--bg)_75%)]" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 py-4 md:px-8">
        <Label>{t("Focus")}</Label>
        <div className="flex items-center gap-1">
          <IconButton label={t("Timer settings")} onClick={() => setSettingsOpen(true)}>
            <Settings2 className="size-4" strokeWidth={1.5} />
          </IconButton>
          <Link href="/today" aria-label={t("Exit focus mode")} className="inline-flex size-10 items-center justify-center text-muted-strong transition-colors hover:text-fg">
            <X className="size-5" strokeWidth={1.25} />
          </Link>
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.p key={timer.phase} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="label-tech text-muted-strong">
              {t(PHASE_LABEL[timer.phase])}
              {timer.phase === "work" ? ` · ${t("{n} of {total}", { n: (timer.cycle % focus.longEvery) + 1, total: focus.longEvery })}` : ""}
            </motion.p>
          </AnimatePresence>
          <p
            className="tabular-nums text-[clamp(5rem,22vw,13rem)] font-extralight leading-none tracking-[-0.02em] text-fg-strong font-tabular"
            role="timer"
            aria-live="off"
            aria-label={t("{time} left", { time: formatClock(left) })}
          >
            {formatClock(left)}
          </p>
          <div className="mt-4 w-[min(520px,80vw)]" aria-hidden>
            <div className="relative h-px bg-line">
              <div className="absolute inset-y-0 left-0 bg-fg-strong transition-[width] duration-300 ease-linear" style={{ width: `${progress * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between">
              {Array.from({ length: 11 }, (_, i) => (
                <span key={i} className={cn("w-px", i % 5 === 0 ? "h-2" : "h-1", i / 10 <= progress ? "bg-fg" : "bg-line")} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-3">
          <IconButton label={t("Reset")} size="lg" onClick={reset} disabled={timer.status === "idle"}>
            <RotateCcw className="size-5" strokeWidth={1.25} />
          </IconButton>
          {running ? (
            <Button size="lg" onClick={pause} className="w-40">
              <Pause className="size-4" strokeWidth={1.5} /> {t("Pause")}
            </Button>
          ) : (
            <Button size="lg" onClick={start} className="w-40" disabled={status !== "ready"}>
              <Play className="size-4" strokeWidth={1.5} /> {timer.status === "paused" ? t("Resume") : t("Start")}
            </Button>
          )}
          <IconButton label={timer.phase === "work" ? t("Skip to break") : t("Skip break")} size="lg" onClick={() => advance(false)}>
            <SkipForward className="flip-rtl size-5" strokeWidth={1.25} />
          </IconButton>
        </div>
        <p className="mt-6 hidden items-center gap-2 text-[12px] text-muted-strong md:flex">
          <Kbd>{t("Space")}</Kbd> {t("start / pause")} <Kbd>{t("R")}</Kbd> {t("reset")} <Kbd>{t("S")}</Kbd> {t("skip")}
        </p>
      </div>

      <footer className="relative z-10 grid grid-cols-3 border-t border-line bg-bg/70 backdrop-blur-sm">
        <div className="flex flex-col gap-1 px-4 py-4 md:px-8">
          <Label>{t("Today")}</Label>
          <span className="tabular-nums text-[15px] text-fg">{stats.todayMin} {t("min")}</span>
        </div>
        <div className="flex flex-col gap-1 border-l border-line px-4 py-4 md:px-8">
          <Label>{t("This week")}</Label>
          <span className="tabular-nums text-[15px] text-fg">
            {stats.weekMin} {t("min")} <span className="text-muted-strong">· {stats.weekCount}</span>
          </span>
        </div>
        <div className="flex flex-col gap-1 border-l border-line px-4 py-4 md:px-8">
          <Label>{t("Sessions today")}</Label>
          <span className="flex min-h-[22px] flex-wrap items-center gap-1">
            {stats.todays.length === 0 ? <span className="tabular-nums text-[15px] text-muted-strong">—</span> : null}
            {stats.todays.slice(0, 12).map((s) => (
              <span
                key={s.id}
                title={`${Math.round(s.completedDuration / 60)} ${t("min")}`}
                className={cn("h-3.5 w-2", s.completedDuration >= s.duration ? "bg-fg" : "border border-fg")}
              />
            ))}
          </span>
        </div>
      </footer>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t("Timer")} description={t("Changes apply from the next round.")}>
        <div className="-mt-4 flex flex-col">
          <Stepper label={t("Focus time")} value={focus.work} min={5} max={120} onChange={(work) => updateSettings({ focusSettings: { work } })} />
          <Stepper label={t("Short break")} value={focus.short} min={1} max={30} onChange={(short) => updateSettings({ focusSettings: { short } })} />
          <Stepper label={t("Long break")} value={focus.long} min={5} max={60} onChange={(long) => updateSettings({ focusSettings: { long } })} />
          <Stepper label={t("Long break after")} value={focus.longEvery} min={2} max={8} unit="×" onChange={(longEvery) => updateSettings({ focusSettings: { longEvery } })} />
          <div className="flex items-center justify-between py-4">
            <span className="text-[15px] text-fg">{t("Start the next round automatically")}</span>
            <Switch checked={focus.autoStart} onChange={(autoStart) => updateSettings({ focusSettings: { autoStart } })} label={t("Start the next round automatically")} />
          </div>
        </div>
      </Sheet>
      <Toaster />
    </main>
  );
}
