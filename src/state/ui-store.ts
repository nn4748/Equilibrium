"use client";

import { create } from "zustand";

const SIDEBAR_KEY = "eq:ui:sidebar";

/** Ephemeral interface state. Only the sidebar preference is remembered. */
interface UIState {
  sidebarCollapsed: boolean;
  moreOpen: boolean;
  hydrate: () => void;
  toggleSidebar: () => void;
  setMoreOpen: (open: boolean) => void;
}

export const useUI = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  moreOpen: false,

  hydrate: () => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY);
      if (stored !== null) set({ sidebarCollapsed: stored === "1" });
    } catch {
      /* ignore */
    }
  },

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    set({ sidebarCollapsed: next });
  },

  setMoreOpen: (moreOpen) => set({ moreOpen }),
}));
