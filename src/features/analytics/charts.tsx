"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { t } from "@/i18n";

/** Width of an element, tracked with ResizeObserver, so lines stay 1px crisp. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export interface Datum {
  label: string;
  value: number | null;
  /** Readout text when the datum is inspected. */
  detail: string;
}

const AXIS_W = 30;

/** Readout line above every chart: shows the inspected datum, or the default. */
function Readout({ text }: { text: React.ReactNode }) {
  return (
    <p aria-live="polite" className="min-h-5 truncate tabular-nums text-[12px] text-fg">
      {text}
    </p>
  );
}

function useInspect(count: number) {
  const [index, setIndex] = useState<number | null>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const base = index ?? count - 1;
    setIndex(Math.max(0, Math.min(count - 1, base + (e.key === "ArrowRight" ? 1 : -1))));
  };
  return { index, setIndex, onKeyDown };
}

function YAxis({ height, max, ticks, plotW, format }: { height: number; max: number; ticks: number[]; plotW: number; format: (v: number) => string }) {
  return (
    <g>
      {ticks.map((t) => {
        const y = Math.round(height - (t / max) * height) + 0.5;
        return (
          <g key={t}>
            <line x1={AXIS_W} x2={AXIS_W + plotW} y1={y} y2={y} stroke="var(--line)" strokeDasharray={t === 0 ? undefined : "2 3"} />
            <text x={AXIS_W - 6} y={y} textAnchor="end" dominantBaseline="middle" className="fill-muted-strong tabular-nums" fontSize={11}>
              {format(t)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Vertical bars with a shared 0–max axis. Null values draw as a hatched stub. */
export function BarChart({
  data,
  max = 100,
  ticks = [0, 50, 100],
  height = 160,
  format = (v) => String(Math.round(v)),
  label,
  fallback,
  labelEvery = 1,
}: {
  data: Datum[];
  max?: number;
  ticks?: number[];
  height?: number;
  format?: (v: number) => string;
  label: string;
  fallback: string;
  labelEvery?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { index, setIndex, onKeyDown } = useInspect(data.length);
  const plotW = Math.max(0, width - AXIS_W);
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(28, band * 0.62));
  const shown = index !== null ? data[index] : undefined;

  return (
    <div ref={ref} className="flex flex-col gap-3">
      <Readout text={shown ? `${shown.label} — ${shown.detail}` : <span className="text-muted-strong">{fallback}</span>} />
      {width > 0 ? (
        <svg
          width={width}
          height={height + 22}
          role="img"
          tabIndex={0}
          aria-label={`${label}. ${t("Use the left and right arrow keys to see each value.")}`}
          onKeyDown={onKeyDown}
          onPointerLeave={() => setIndex(null)}
          onBlur={() => setIndex(null)}
          className="block overflow-visible"
        >
          <YAxis height={height} max={max} ticks={ticks} plotW={plotW} format={format} />
          {data.map((d, i) => {
            const cx = AXIS_W + band * i + band / 2;
            const h = d.value === null ? 0 : Math.max(1, (Math.min(d.value, max) / max) * height);
            const active = i === index;
            return (
              <g key={i} onPointerEnter={() => setIndex(i)} onClick={() => setIndex(i)}>
                <rect x={AXIS_W + band * i} y={0} width={band} height={height + 22} fill="transparent" />
                {d.value === null ? (
                  <rect x={cx - barW / 2} y={height - 3} width={barW} height={3} fill="var(--line)" />
                ) : (
                  <rect x={cx - barW / 2} y={height - h} width={barW} height={h} fill={active ? "var(--fg-strong)" : "var(--fg)"} opacity={index === null || active ? 1 : 0.45} />
                )}
                {i % labelEvery === 0 || active ? (
                  <text x={cx} y={height + 14} textAnchor="middle" className={cn("tabular-nums", active ? "fill-fg" : "fill-muted-strong")} fontSize={11}>
                    {d.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height: height + 22 }} />
      )}
    </div>
  );
}

/** Daily line with a 7-day moving average; crosshair readout on hover/keys. */
export function LineChart({ data, height = 200, label, fallback }: { data: Datum[]; height?: number; label: string; fallback: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { index, setIndex, onKeyDown } = useInspect(data.length);
  const plotW = Math.max(0, width - AXIS_W - 4);
  const x = (i: number) => AXIS_W + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (v: number) => height - (v / 100) * height;

  // Raw daily path, broken where there is no data.
  let path = "";
  data.forEach((d, i) => {
    if (d.value === null) return;
    path += `${path && data[i - 1]?.value != null ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`;
  });
  // Trailing 7-day mean of available days.
  let avgPath = "";
  data.forEach((_, i) => {
    const win = data.slice(Math.max(0, i - 6), i + 1).filter((d) => d.value !== null);
    if (win.length < 3) return;
    const mean = win.reduce((s, d) => s + d.value!, 0) / win.length;
    avgPath += `${avgPath ? "L" : "M"}${x(i).toFixed(1)},${y(mean).toFixed(1)}`;
  });

  const shown = index !== null ? data[index] : undefined;
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - rect.left - AXIS_W) / Math.max(1, plotW);
    setIndex(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))));
  };

  return (
    <div ref={ref} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <Readout text={shown ? `${shown.label} — ${shown.detail}` : <span className="text-muted-strong">{fallback}</span>} />
        <div className="hidden shrink-0 items-center gap-4 tabular-nums text-[12px] text-muted-strong sm:flex" aria-hidden>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-4 bg-muted" /> {t("Daily")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-fg" /> {t("7-day mean")}
          </span>
        </div>
      </div>
      {width > 0 ? (
        <svg
          width={width}
          height={height + 22}
          role="img"
          tabIndex={0}
          aria-label={`${label}. ${t("Use the left and right arrow keys to see each day.")}`}
          onKeyDown={onKeyDown}
          onPointerMove={onMove}
          onPointerLeave={() => setIndex(null)}
          onBlur={() => setIndex(null)}
          className="block touch-pan-y"
        >
          <YAxis height={height} max={100} ticks={[0, 50, 100]} plotW={plotW} format={(v) => String(v)} />
          <path d={path} fill="none" stroke="var(--muted)" strokeWidth={1} />
          <path d={avgPath} fill="none" stroke="var(--fg)" strokeWidth={2} strokeLinejoin="round" />
          {index !== null && shown ? (
            <g>
              <line x1={x(index)} x2={x(index)} y1={0} y2={height} stroke="var(--fg-strong)" strokeWidth={1} strokeDasharray="2 2" />
              {shown.value !== null ? <rect x={x(index) - 4} y={y(shown.value) - 4} width={8} height={8} fill="var(--bg)" stroke="var(--fg-strong)" strokeWidth={1.5} /> : null}
            </g>
          ) : null}
          {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((i) =>
            data[i] ? (
              <text key={i} x={x(i)} y={height + 14} textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"} className="fill-muted-strong tabular-nums" fontSize={11}>
                {data[i]!.label}
              </text>
            ) : null,
          )}
        </svg>
      ) : (
        <div style={{ height: height + 22 }} />
      )}
    </div>
  );
}

/** Ranked horizontal bars (0–100%) with the value printed in text ink. */
export function RankBars({ rows }: { rows: { id: string; label: string; rate: number; note: string }[] }) {
  return (
    <ul className="flex flex-col">
      {rows.map((r) => (
        <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-x-4 gap-y-2 border-b border-line py-3">
          <span className="truncate text-[14px] text-fg">{r.label}</span>
          <span className="text-right tabular-nums text-[13px] font-tabular text-fg-strong">{Math.round(r.rate * 100)}%</span>
          <span className="relative col-span-2 h-1.5 bg-surface-2" aria-hidden>
            <span className="absolute inset-y-0 left-0 bg-fg" style={{ width: `${r.rate * 100}%` }} />
          </span>
          <span className="col-span-2 text-[12px] text-muted-strong">{r.note}</span>
        </li>
      ))}
    </ul>
  );
}
