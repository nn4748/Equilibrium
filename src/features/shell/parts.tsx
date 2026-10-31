"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { formatCoordinate, formatStamp } from "@/lib/format";
import { useTheme } from "@/state/theme";
import { IconButton } from "@/ui/button";
import { t } from "@/i18n";

export function Wordmark({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label={t("Equilibrium — home")} className={cn("inline-flex items-center gap-3 text-fg-strong", className)}>
      <svg aria-hidden viewBox="0 0 24 24" className="size-6 shrink-0">
        <path d="M1.5 20.5h21M4 20.5 12 4l8 16.5M8 12.25h8" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="miter" />
        <circle cx="12" cy="4" r="1.25" fill="currentColor" />
      </svg>
      {compact ? null : <span className="text-[17px] font-semibold tracking-[-0.01em]">{t("Equilibrium")}</span>}
    </Link>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const resolved = useTheme((s) => s.resolved);
  const toggle = useTheme((s) => s.toggle);
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <IconButton label={next === "dark" ? t("Switch to dark theme") : t("Switch to light theme")} onClick={toggle} className={className}>
      {resolved === "dark" ? <Sun className="size-4" strokeWidth={1.5} /> : <Moon className="size-4" strokeWidth={1.5} />}
    </IconButton>
  );
}

/** Current date. Rendered after mount so server and client markup match. */
export function DateReadout({ className, stacked = false }: { className?: string; stacked?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className={cn("label-tech font-tabular text-muted-strong", stacked ? "flex flex-col gap-1" : "flex gap-3", className)}>
      <span className="text-fg">{now ? formatStamp(now) : "————.——.——"}</span>
      <span>{now ? formatCoordinate(now) : "D——— / W——"}</span>
    </div>
  );
}
