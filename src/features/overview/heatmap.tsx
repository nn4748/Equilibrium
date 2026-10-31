"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { addDays, formatKey, keyFromParts, startOfWeek } from "@/domain/dates";
import type { History } from "@/domain/scoring";
import { IconButton } from "@/ui/button";
import { Label } from "@/ui/typography";
import { HEAT_LABELS, describeDay, heatLevel } from "./heat";

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 28;
const TOP = 18;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Annual activity grid. One focusable SVG: arrow keys move a selection,
 * pointer hover and tap select directly. Details render beneath, so they work
 * on touch screens as well as with a mouse.
 */
export function Heatmap({ history, weekStartsOn }: { history: History; weekStartsOn: 0 | 1 }) {
  const thisYear = Number(history.today.slice(0, 4));
  const firstYear = history.start ? Number(history.start.slice(0, 4)) : thisYear;
  const [year, setYear] = useState(thisYear);
  const [selected, setSelected] = useState<string | null>(null);

  const { cells, weeks, monthCols } = useMemo(() => {
    const jan1 = keyFromParts(year, 0, 1);
    const dec31 = keyFromParts(year, 11, 31);
    const origin = startOfWeek(jan1, weekStartsOn);
    const out: { key: string; col: number; row: number }[] = [];
    const monthCols: { label: string; col: number }[] = [];
    let col = 0;
    for (let week = origin; week <= dec31; week = addDays(week, 7), col++) {
      for (let row = 0; row < 7; row++) {
        const key = addDays(week, row);
        if (key < jan1 || key > dec31) continue;
        out.push({ key, col, row });
        if (key.endsWith("-01")) monthCols.push({ label: MONTHS[Number(key.slice(5, 7)) - 1]!, col });
      }
    }
    return { cells: out, weeks: col, monthCols };
  }, [year, weekStartsOn]);

  // Keep the most recent weeks in view on narrow screens.
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [year]);

  const byKey = useMemo(() => new Map(cells.map((c) => [c.key, c])), [cells]);
  const active = selected && byKey.has(selected) ? selected : null;
  const activeMetrics = active ? history.days.get(active) : undefined;
  const width = LEFT + weeks * STEP;
  const height = TOP + 7 * STEP;
  const dayLabels = weekStartsOn === 1 ? ["Mon", "", "Wed", "", "Fri", "", ""] : ["", "Mon", "", "Wed", "", "Fri", ""];

  const yearTotals = useMemo(() => {
    let perfect = 0;
    let tracked = 0;
    for (const c of cells) {
      const lvl = heatLevel(history.days.get(c.key));
      if (lvl === null) continue;
      tracked++;
      if (lvl === 4) perfect++;
    }
    return { perfect, tracked };
  }, [cells, history]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const base = active ?? (year === thisYear ? history.today : keyFromParts(year, 0, 1));
    const delta = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    const next = addDays(base, delta);
    if (byKey.has(next)) setSelected(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          <IconButton label="Previous year" size="sm" disabled={year <= firstYear} onClick={() => setYear(year - 1)}>
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </IconButton>
          <span className="w-12 text-center font-mono text-[14px] text-fg">{year}</span>
          <IconButton label="Next year" size="sm" disabled={year >= thisYear} onClick={() => setYear(year + 1)}>
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </IconButton>
        </div>
        <span className="font-mono text-[12px] text-muted-strong">
          {yearTotals.perfect} balanced / {yearTotals.tracked} tracked days
        </span>
      </div>

      <div ref={scroller} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          tabIndex={0}
          role="group"
          aria-label={`Activity in ${year}. Use arrow keys to inspect days.`}
          onKeyDown={onKeyDown}
          onPointerLeave={() => setSelected(null)}
          className="block outline-offset-4"
        >
          {monthCols.map((m) => (
            <text key={m.label} x={LEFT + m.col * STEP} y={10} className="fill-muted-strong font-mono" fontSize={9}>
              {m.label}
            </text>
          ))}
          {dayLabels.map((d, i) =>
            d ? (
              <text key={i} x={0} y={TOP + i * STEP + CELL - 2} className="fill-muted-strong font-mono" fontSize={9}>
                {d}
              </text>
            ) : null,
          )}
          {cells.map((c) => {
            const future = c.key > history.today;
            const lvl = heatLevel(history.days.get(c.key));
            const isActive = c.key === active;
            const tracked = !!history.start && c.key >= history.start && !future;
            return (
              <rect
                key={c.key}
                x={LEFT + c.col * STEP}
                y={TOP + c.row * STEP}
                width={CELL}
                height={CELL}
                fill={lvl === null ? (tracked || future ? "transparent" : "var(--line-faint)") : `var(--heat-${lvl})`}
                stroke={isActive ? "var(--fg-strong)" : lvl === null && tracked ? "var(--line)" : "none"}
                strokeWidth={isActive ? 1.5 : 1}
                strokeDasharray={lvl === null && tracked && !isActive ? "2 2" : undefined}
                opacity={future ? 0.25 : 1}
                onPointerEnter={() => setSelected(c.key)}
                onClick={() => setSelected(c.key)}
              />
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-3">
        <p aria-live="polite" className="min-h-5 font-mono text-[12px] text-fg">
          {active ? (
            <>
              {formatKey(active, { weekday: "short", day: "numeric", month: "short" })} <span className="text-muted-strong">— {describeDay(activeMetrics)}</span>
            </>
          ) : (
            <span className="text-muted-strong">Select a day for details.</span>
          )}
        </p>
        <div className="flex items-center gap-2" aria-label="Legend: balance score">
          <Label className="mr-1">Less</Label>
          {HEAT_LABELS.map((l, i) => (
            <span key={l} title={l} className="size-[11px]" style={{ background: `var(--heat-${i})` }} />
          ))}
          <Label className="ml-1">More</Label>
        </div>
      </div>
    </div>
  );
}
