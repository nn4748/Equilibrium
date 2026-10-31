"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { addDays, addMonths, daysInMonth, formatKey, startOfMonth, startOfWeek } from "@/domain/dates";
import type { History } from "@/domain/scoring";
import { cn } from "@/lib/cn";
import { IconButton } from "@/ui/button";
import { Data, Label } from "@/ui/typography";
import { describeDay, heatLevel } from "./heat";

/** Month at a glance: each day filled by its balance level, with month totals. */
export function MonthCalendar({ history, weekStartsOn }: { history: History; weekStartsOn: 0 | 1 }) {
  const [month, setMonth] = useState(() => startOfMonth(history.today));
  const [selected, setSelected] = useState<string | null>(null);
  const first = history.start ? startOfMonth(history.start) : startOfMonth(history.today);
  const current = startOfMonth(history.today);

  const { days, stats } = useMemo(() => {
    const n = daysInMonth(month);
    const gridStart = startOfWeek(month, weekStartsOn);
    const lead = Math.round((Date.parse(month) - Date.parse(gridStart)) / 86_400_000);
    const list: (string | null)[] = [...Array<null>(lead).fill(null)];
    let sum = 0;
    let counted = 0;
    let perfect = 0;
    let completions = 0;
    for (let i = 0; i < n; i++) {
      const key = addDays(month, i);
      list.push(key);
      const m = history.days.get(key);
      if (m && m.balanceScore !== null) {
        sum += m.balanceScore;
        counted++;
        if (m.balanceScore >= 100) perfect++;
      }
      completions += m?.completedCount ?? 0;
    }
    return { days: list, stats: { avg: counted ? sum / counted : null, perfect, completions } };
  }, [month, weekStartsOn, history]);

  const heads = weekStartsOn === 1 ? ["M", "T", "W", "T", "F", "S", "S"] : ["S", "M", "T", "W", "T", "F", "S"];
  const shown = selected ?? history.today;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-medium text-fg-strong">{formatKey(month, { month: "long", year: "numeric" })}</h3>
        <div className="flex">
          <IconButton label="Previous month" size="sm" disabled={month <= first} onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </IconButton>
          <IconButton label="Next month" size="sm" disabled={month >= current} onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {heads.map((h, i) => (
          <span key={i} className="label-tech pb-1 text-center text-muted">
            {h}
          </span>
        ))}
        {days.map((key, i) => {
          if (!key) return <span key={`pad-${i}`} />;
          const m = history.days.get(key);
          const lvl = heatLevel(m);
          const future = key > history.today;
          const isToday = key === history.today;
          return (
            <button
              key={key}
              type="button"
              disabled={future}
              onClick={() => setSelected(key)}
              aria-label={`${formatKey(key, { day: "numeric", month: "long" })}: ${describeDay(m)}`}
              aria-pressed={key === selected}
              className={cn(
                "relative flex aspect-square items-start justify-start p-1.5 font-mono text-[11px] transition-[outline-color]",
                lvl !== null && lvl >= 3 ? "text-bg" : lvl !== null && lvl >= 1 ? "text-fg" : "text-muted-strong",
                future && "opacity-30",
                key === shown ? "outline outline-1 outline-offset-1 outline-fg" : "",
              )}
              style={{ background: lvl === null ? "transparent" : `var(--heat-${lvl})`, border: lvl === null ? "1px dashed var(--line)" : undefined }}
            >
              {Number(key.slice(8))}
              {isToday ? <span aria-hidden className={cn("absolute bottom-1.5 right-1.5 size-1", lvl !== null && lvl >= 3 ? "bg-bg" : "bg-fg")} /> : null}
            </button>
          );
        })}
      </div>
      <p className="font-mono text-[12px] text-fg">
        {formatKey(shown, { weekday: "short", day: "numeric", month: "short" })} <span className="text-muted-strong">— {describeDay(history.days.get(shown))}</span>
      </p>
      <dl className="grid grid-cols-3 border-t border-line pt-4">
        <div className="flex flex-col gap-1">
          <dt>
            <Label>Average</Label>
          </dt>
          <dd>
            <Data className="text-[18px] text-fg-strong">{stats.avg === null ? "—" : Math.round(stats.avg)}</Data>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt>
            <Label>Balanced</Label>
          </dt>
          <dd>
            <Data className="text-[18px] text-fg-strong">{stats.perfect}</Data>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt>
            <Label>Completions</Label>
          </dt>
          <dd>
            <Data className="text-[18px] text-fg-strong">{stats.completions}</Data>
          </dd>
        </div>
      </dl>
    </div>
  );
}
