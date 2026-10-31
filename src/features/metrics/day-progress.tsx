"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { useData } from "@/state/store";
import { Label } from "@/ui/typography";
import { t } from "@/i18n";

/** How far through the (shifted) day we are, on a 24-hour ruler. */
export function DayProgress({ className }: { className?: string }) {
  const startHour = useData((s) => s.settings.preferences.dayStartsAtHour);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const minutes = now ? (now.getHours() * 60 + now.getMinutes() - startHour * 60 + 1440) % 1440 : 0;
  const pct = minutes / 1440;
  const clock = now ? `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}` : "--:--";
  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between">
        <Label>{t("Day elapsed")}</Label>
        <span className="tabular-nums text-data font-tabular text-fg">
          {clock} <span className="text-muted-strong">· {Math.round(pct * 100)}%</span>
        </span>
      </div>
      <div className="relative h-6" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={t("Day elapsed")}>
        <div className="absolute inset-x-0 bottom-0 flex h-full items-end justify-between">
          {hours.map((h) => (
            <span
              key={h}
              className={cn("w-px", h % 6 === 0 ? "h-3" : "h-1.5", h / 24 <= pct ? "bg-fg" : "bg-line")}
            />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 h-px bg-fg transition-[width] duration-700" style={{ width: `${pct * 100}%` }} />
        <div className="absolute -top-0.5 h-4 w-px bg-fg-strong transition-[left] duration-700" style={{ left: `${pct * 100}%` }} />
      </div>
      <div className="flex justify-between tabular-nums text-[12px] text-muted-strong">
        {[0, 6, 12, 18, 24].map((h) => (
          <span key={h}>{String((h + startHour) % 24).padStart(2, "0")}</span>
        ))}
      </div>
    </div>
  );
}
