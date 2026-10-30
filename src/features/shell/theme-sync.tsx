"use client";

import { useEffect } from "react";
import { useTheme } from "@/state/theme";

/** Reconciles the store with the theme the boot script already applied. */
export function ThemeSync() {
  const hydrate = useTheme((s) => s.hydrate);
  useEffect(hydrate, [hydrate]);
  return null;
}
