"use client";

import { create } from "zustand";

const SIDEBAR_KEY = "eq:ui:sidebar";

/** Interface state. Only the sidebar preference is remembered. */
interface UIState {
  sidebarCollapsed: boolean;
  moreOpen: boolean;
  paletteOpen: boolean;
  /** Habit editor: closed, creating (null id) or editing. */
  editor: { open: boolean; habitId: string | null };
  hydrate: () => void;
  toggleSidebar: () => void;
  setMoreOpen: (open: boolean) => void;
  setPaletteOpen: (open: boolean) => void;
  openEditor: (habitId?: string | null) => void;
  closeEditor: () => void;
}

export const useUI = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  moreOpen: false,
  paletteOpen: false,
  editor: { open: false, habitId: null },

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
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  openEditor: (habitId = null) => set({ editor: { open: true, habitId }, paletteOpen: false, moreOpen: false }),
  closeEditor: () => set((s) => ({ editor: { ...s.editor, open: false } })),
}));
