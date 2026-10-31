"use client";

import { Fragment, useEffect } from "react";
import { useLang } from "@/i18n";

/**
 * Re-mounts the app when the language changes, so every string — including
 * ones read outside React render — switches at once.
 */
export function LangRoot({ children }: { children: React.ReactNode }) {
  const lang = useLang((s) => s.lang);
  const hydrate = useLang((s) => s.hydrate);
  useEffect(hydrate, [hydrate]);
  return <Fragment key={lang}>{children}</Fragment>;
}
