"use client";

import { MQ, useMediaQuery } from "@/lib/hooks";
import { useData } from "./store";

/** Reduced motion, from the in-app setting or, by default, the system setting. */
export function useReducedMotionPref(): boolean {
  const pref = useData((s) => s.settings.preferences.reducedMotion);
  const system = useMediaQuery(MQ.reducedMotion);
  return pref === "on" || (pref === "system" && system);
}
