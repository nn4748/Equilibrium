"use client";

import { create } from "zustand";
import { THEME_STORAGE_KEY } from "@/lib/boot";

export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" || value === "system" ? value : "dark";
  } catch {
    return "dark";
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

interface ThemeState {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  hydrated: boolean;
  hydrate: () => void;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

function apply(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved;
}

export const useTheme = create<ThemeState>((set, get) => ({
  preference: "dark",
  resolved: "dark",
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return;
    const preference = readPreference();
    const resolved = resolveTheme(preference);
    apply(resolved);
    set({ preference, resolved, hydrated: true });

    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
      if (get().preference !== "system") return;
      const next = resolveTheme("system");
      apply(next);
      set({ resolved: next });
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      get().setPreference(readPreference());
    });
  },

  setPreference: (preference) => {
    const resolved = resolveTheme(preference);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
    apply(resolved);
    set({ preference, resolved });
  },

  toggle: () => get().setPreference(get().resolved === "dark" ? "light" : "dark"),
}));
