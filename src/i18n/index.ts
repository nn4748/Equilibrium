"use client";

import { useCallback } from "react";
import { create } from "zustand";
import { parseKey } from "@/domain/dates";
import type { DateKey, Habit } from "@/domain/types";
import { LANG_KEY } from "@/lib/boot";
import { AR } from "./ar";

export type Lang = "en" | "ar";

type Vars = Record<string, string | number>;

function fill(text: string, vars?: Vars) {
  return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? "")) : text;
}

/** English text is the key; Arabic falls back to English when a string is missing. */
export function tr(lang: Lang, text: string, vars?: Vars): string {
  return fill(lang === "ar" ? (AR[text] ?? text) : text, vars);
}

interface LangState {
  lang: Lang;
  hydrated: boolean;
  hydrate: () => void;
  setLang: (lang: Lang) => void;
}

function apply(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

export const useLang = create<LangState>((set, get) => ({
  lang: "en",
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    let lang: Lang = "en";
    try {
      lang = localStorage.getItem(LANG_KEY) === "ar" ? "ar" : "en";
    } catch {
      /* storage blocked */
    }
    apply(lang);
    set({ lang, hydrated: true });
  },
  setLang: (lang) => {
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* storage blocked */
    }
    apply(lang);
    set({ lang });
  },
}));

/** For event handlers and other non-render code. */
export function t(text: string, vars?: Vars): string {
  return tr(useLang.getState().lang, text, vars);
}

/** Translation function for render; re-renders the component when the language changes. */
export function useT() {
  const lang = useLang((s) => s.lang);
  return useCallback((text: string, vars?: Vars) => tr(lang, text, vars), [lang]);
}

const locale = () => (useLang.getState().lang === "ar" ? "ar-u-nu-latn" : "en-GB");
const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(options: Intl.DateTimeFormatOptions) {
  const id = locale() + JSON.stringify(options);
  let f = fmtCache.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat(locale(), options);
    fmtCache.set(id, f);
  }
  return f;
}

/** Formats a calendar date in the current language (Latin digits in both). */
export function formatDate(key: DateKey, options: Intl.DateTimeFormatOptions): string {
  return fmt(options).format(parseKey(key));
}

/** Weekday name for 0 (Sunday) … 6, in the current language. */
export function weekdayName(day: number, width: "narrow" | "short" | "long"): string {
  // 2023-01-01 was a Sunday.
  return fmt({ weekday: width }).format(new Date(2023, 0, 1 + day, 12));
}

export function monthName(month: number, width: "short" | "long"): string {
  return fmt({ month: width }).format(new Date(2023, month, 1, 12));
}

/** Habit schedule in words, e.g. "Every day", "3× per week", "Mon · Wed". */
export function describeSchedule(habit: Pick<Habit, "scheduleType" | "scheduledDays" | "weeklyTarget">): string {
  if (habit.scheduleType === "daily") return t("Every day");
  if (habit.scheduleType === "weekly") return t("{n}× per week", { n: habit.weeklyTarget ?? 1 });
  const days = [...habit.scheduledDays].sort();
  if (days.length === 7) return t("Every day");
  if (days.join() === "1,2,3,4,5") return t("Weekdays");
  if (days.join() === "0,6") return t("Weekends");
  return days.map((d) => weekdayName(d, "short")).join(" · ");
}
