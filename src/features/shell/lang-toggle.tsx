"use client";

import { cn } from "@/lib/cn";
import { useLang } from "@/i18n";

/** Switches between English and Arabic. Shows the language you'd switch to. */
export function LangToggle({ className }: { className?: string }) {
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const next = lang === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      onClick={() => setLang(next)}
      lang={next}
      aria-label={next === "ar" ? "التبديل إلى العربية" : "Switch to English"}
      title={next === "ar" ? "العربية" : "English"}
      className={cn(
        "inline-flex h-10 min-w-10 items-center justify-center border border-line px-2.5 text-[14px] font-semibold text-fg transition-colors hover:border-fg",
        className,
      )}
    >
      {next === "ar" ? "ع" : "EN"}
    </button>
  );
}
