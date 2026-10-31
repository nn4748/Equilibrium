"use client";

import { create } from "zustand";
import type { FocusSessionType } from "@/domain/types";

export type TimerStatus = "idle" | "running" | "paused";

interface TimerState {
  phase: FocusSessionType;
  status: TimerStatus;
  /** Epoch ms when the running phase ends. */
  endsAt: number | null;
  /** Ms left while paused or idle. */
  remaining: number;
  /** Planned length of the current phase, ms. */
  duration: number;
  /** Work sessions finished in the current cycle. */
  cycle: number;
}

const KEY = "eq:focus:timer";

function persist(s: TimerState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function restoreTimer(): TimerState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as TimerState;
    if (!["work", "short", "long"].includes(s.phase)) return null;
    return s;
  } catch {
    return null;
  }
}

interface TimerStore extends TimerState {
  hydrated: boolean;
  set: (patch: Partial<TimerState>) => void;
}

/** Timer state is time-stamp based, so it stays accurate in background tabs and across reloads. */
export const useTimer = create<TimerStore>((set, get) => ({
  phase: "work",
  status: "idle",
  endsAt: null,
  remaining: 25 * 60_000,
  duration: 25 * 60_000,
  cycle: 0,
  hydrated: false,
  set: (patch) => {
    set(patch);
    const { phase, status, endsAt, remaining, duration, cycle } = get();
    persist({ phase, status, endsAt, remaining, duration, cycle });
  },
}));

export function timeLeft(s: Pick<TimerState, "status" | "endsAt" | "remaining">, now: number) {
  return s.status === "running" && s.endsAt ? Math.max(0, s.endsAt - now) : s.remaining;
}

export function formatClock(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
